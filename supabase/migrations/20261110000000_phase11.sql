-- Phase 11: admin overview dashboard + safe "delete student". Run ONCE in the Supabase SQL Editor
-- (after the Phase 10 SQL).

-- =====================================================================
-- 1. Keep payment history when a student is deleted
-- =====================================================================
alter table public.payments add column payer_name text;
alter table public.payments add column payer_email text;

update public.payments p
set payer_name = pr.full_name, payer_email = pr.email
from public.profiles pr
where pr.id = p.user_id;

alter table public.payments alter column user_id drop not null;
alter table public.payments drop constraint payments_user_id_fkey;
alter table public.payments
  add constraint payments_user_id_fkey
  foreign key (user_id) references public.profiles (id) on delete set null;

-- Every new payment remembers who it was for, even if that student is deleted later.
create function public.payments_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select full_name, email into new.payer_name, new.payer_email
  from public.profiles where id = new.user_id;
  return new;
end;
$$;

create trigger payments_snapshot_trg
  before insert on public.payments
  for each row execute function public.payments_snapshot();

-- When a student is deleted, close any unfinished checkout of theirs.
create function public.close_payments_on_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.payments
  set status = 'cancelled', note = 'Student account was deleted'
  where user_id = old.id and status in ('pending', 'underpaid');
  return old;
end;
$$;

create trigger profiles_close_payments
  before delete on public.profiles
  for each row execute function public.close_payments_on_delete();

-- If money still arrives for a deleted student, record it and flag it. Never crashes.
create or replace function public.payment_mark_paid(
  p_payment uuid,
  p_ref text default null,
  p_paid_gmd numeric default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  pay public.payments%rowtype;
  prof_status text;
begin
  select * into pay from public.payments where id = p_payment for update;
  if not found then
    return 'not_found';
  end if;
  if pay.status = 'paid' then
    return 'already_paid';
  end if;

  if pay.user_id is null then
    update public.payments
    set status = 'paid',
        paid_at = now(),
        provider_ref = coalesce(provider_ref, p_ref),
        note = 'Paid, but the student account was deleted. Refund or restore the student.'
    where id = pay.id;
    return 'orphan';
  end if;

  if p_paid_gmd is not null and p_paid_gmd < pay.amount_gmd then
    update public.payments
    set status = 'underpaid',
        provider_ref = coalesce(provider_ref, p_ref),
        note = format('Paid D%s but the price was D%s', p_paid_gmd, pay.amount_gmd)
    where id = pay.id;
    return 'underpaid';
  end if;

  update public.payments
  set status = 'paid',
      paid_at = now(),
      provider_ref = coalesce(provider_ref, p_ref)
  where id = pay.id;

  select payment_status into prof_status from public.profiles where id = pay.user_id for update;

  if prof_status = 'cleared' then
    update public.payments
    set note = 'Student was already cleared: paid twice or cleared by an admin. Consider a refund.'
    where id = pay.id;
    return 'duplicate';
  end if;

  update public.profiles
  set payment_status = 'cleared',
      cleared_at = now(),
      cleared_by = null,
      cleared_via = pay.method
  where id = pay.user_id;

  return 'cleared';
end;
$$;

-- =====================================================================
-- 2. Deleting students
-- =====================================================================
create table public.deleted_students (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  full_name text,
  email text,
  whatsapp text,
  was_cleared boolean not null default false,
  cleared_via text,
  deleted_by uuid references public.profiles (id) on delete set null,
  deleted_at timestamptz not null default now()
);
alter table public.deleted_students enable row level security;
create policy "admins read deleted students" on public.deleted_students
  for select to authenticated using (public.is_admin());
-- No write policy: only the server (service role) writes here.

-- Before deleting: what would be lost, and is it safe? Admins only.
create function public.admin_delete_check(target uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  prof public.profiles%rowtype;
  blockers text[] := '{}';
  warnings text[] := '{}';
  earned int;
  paid int;
  pending int;
  reward_for text;
begin
  if not public.is_admin() then
    raise exception 'Not allowed';
  end if;

  select * into prof from public.profiles where id = target;
  if not found then
    return jsonb_build_object('found', false, 'blockers', jsonb_build_array('Student not found'), 'warnings', '[]'::jsonb);
  end if;

  if prof.role <> 'student' then
    blockers := array_append(blockers, 'Admins cannot be deleted here'::text);
  end if;
  if target = auth.uid() then
    blockers := array_append(blockers, 'You cannot delete yourself'::text);
  end if;

  if exists (select 1 from public.payout_requests where user_id = target and status = 'requested') then
    blockers := array_append(blockers, 'This student has an open payout request. Pay or reject it first'::text);
  end if;

  select coalesce(sum(amount), 0)::int into earned from public.referral_rewards where referrer_id = target;
  select coalesce(sum(amount) filter (where status = 'paid'), 0)::int,
         coalesce(sum(amount) filter (where status = 'requested'), 0)::int
    into paid, pending from public.payout_requests where user_id = target;
  if earned - paid - pending > 0 then
    blockers := array_append(blockers, format('This student is owed D%s in referral rewards. Pay it out first', earned - paid - pending));
  end if;

  select r.full_name into reward_for
  from public.referral_rewards rr join public.profiles r on r.id = rr.referrer_id
  where rr.referred_id = target;
  if reward_for is not null then
    warnings := array_append(warnings, format('They earned a referral reward for %s. Deleting removes that reward', reward_for));
  end if;

  if prof.payment_status = 'cleared' then
    warnings := array_append(warnings, 'This student has paid. Their payment records are kept, but their account, progress and certificates are erased'::text);
  end if;

  return jsonb_build_object(
    'found', true,
    'name', prof.full_name,
    'email', prof.email,
    'whatsapp', prof.whatsapp,
    'was_cleared', prof.payment_status = 'cleared',
    'cleared_via', prof.cleared_via,
    'blockers', to_jsonb(blockers),
    'warnings', to_jsonb(warnings)
  );
end;
$$;

revoke all on function public.admin_delete_check(uuid) from public, anon;
grant execute on function public.admin_delete_check(uuid) to authenticated;

-- =====================================================================
-- 3. Admin overview numbers
-- =====================================================================
create function public.admin_overview()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Not allowed';
  end if;

  with
  st as (select * from public.profiles where role = 'student'),
  pays as (
    select * from public.payments where status = 'paid' and provider <> 'mock'
  ),
  last_active as (
    select user_id, max(last_report_at) as at from public.lesson_progress group by user_id
  )
  select jsonb_build_object(
    'totals', jsonb_build_object(
      'students', (select count(*) from st),
      'cleared', (select count(*) from st where payment_status = 'cleared'),
      'pending', (select count(*) from st where payment_status <> 'cleared'),
      'signups_today', (select count(*) from st where created_at >= date_trunc('day', now())),
      'signups_7d', (select count(*) from st where created_at >= now() - interval '7 days'),
      'signups_30d', (select count(*) from st where created_at >= now() - interval '30 days'),
      'cleared_7d', (select count(*) from st where cleared_at >= now() - interval '7 days'),
      'cleared_30d', (select count(*) from st where cleared_at >= now() - interval '30 days')
    ),
    'online', jsonb_build_object(
      'total', (select coalesce(sum(amount_gmd), 0) from pays),
      'd7', (select coalesce(sum(amount_gmd), 0) from pays where paid_at >= now() - interval '7 days'),
      'd30', (select coalesce(sum(amount_gmd), 0) from pays where paid_at >= now() - interval '30 days'),
      'count', (select count(*) from pays),
      'by_method', (
        select coalesce(jsonb_agg(jsonb_build_object('k', m.method, 'n', m.n, 'gmd', m.gmd) order by m.gmd desc), '[]'::jsonb)
        from (select method, count(*) as n, sum(amount_gmd) as gmd from pays group by method) m
      )
    ),
    'days', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', d.day,
        'signups', coalesce(su.n, 0),
        'cleared', coalesce(cl.n, 0),
        'online_gmd', coalesce(rv.gmd, 0)
      ) order by d.day), '[]'::jsonb)
      from (
        select g::date as day
        from generate_series(current_date - 29, current_date, interval '1 day') g
      ) d
      left join (select created_at::date as day, count(*) as n from st group by 1) su on su.day = d.day
      left join (select cleared_at::date as day, count(*) as n from st where cleared_at is not null group by 1) cl on cl.day = d.day
      left join (select paid_at::date as day, sum(amount_gmd) as gmd from pays group by 1) rv on rv.day = d.day
    ),
    'methods', (
      select coalesce(jsonb_agg(jsonb_build_object('k', k, 'n', n) order by n desc), '[]'::jsonb)
      from (
        select coalesce(cleared_via, 'manual') as k, count(*) as n
        from st where payment_status = 'cleared' group by 1
      ) x
    ),
    'stale_pending', jsonb_build_object(
      'count', (select count(*) from st where payment_status <> 'cleared' and created_at < now() - interval '3 days'),
      'list', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', id, 'name', full_name, 'whatsapp', whatsapp, 'created_at', created_at
        ) order by created_at desc), '[]'::jsonb)
        from (
          select id, full_name, whatsapp, created_at from st
          where payment_status <> 'cleared' and created_at < now() - interval '3 days'
          order by created_at desc limit 10
        ) s
      )
    ),
    'at_risk', jsonb_build_object(
      'count', (
        select count(*) from st
        left join last_active la on la.user_id = st.id
        where st.payment_status = 'cleared'
          and st.cleared_at < now() - interval '7 days'
          and (la.at is null or la.at < now() - interval '14 days')
      ),
      'list', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', id, 'name', full_name, 'whatsapp', whatsapp, 'last_active', last_active, 'cleared_at', cleared_at
        ) order by coalesce(last_active, cleared_at) asc), '[]'::jsonb)
        from (
          select st.id, st.full_name, st.whatsapp, la.at as last_active, st.cleared_at from st
          left join last_active la on la.user_id = st.id
          where st.payment_status = 'cleared'
            and st.cleared_at < now() - interval '7 days'
            and (la.at is null or la.at < now() - interval '14 days')
          order by coalesce(la.at, st.cleared_at) asc limit 10
        ) r
      )
    ),
    'attention', jsonb_build_object(
      'underpaid', (select count(*) from public.payments where status = 'underpaid'),
      'flagged', (select count(*) from public.payments where status = 'paid' and note is not null and provider <> 'mock'),
      'unmatched', (select count(*) from public.payment_events where handled = false and outcome in ('no_match', 'no_order_id', 'not_found')),
      'payouts', (select count(*) from public.payout_requests where status = 'requested')
    ),
    'recent', (
      select coalesce(jsonb_agg(jsonb_build_object('kind', kind, 'name', name, 'detail', detail, 'at', at) order by at desc), '[]'::jsonb)
      from (
        (select 'signup' as kind, full_name as name, null::text as detail, created_at as at
         from st order by created_at desc limit 8)
        union all
        (select 'cleared', full_name, coalesce(cleared_via, 'manual'), cleared_at
         from st where cleared_at is not null order by cleared_at desc limit 8)
      ) u
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;
