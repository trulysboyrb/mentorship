-- Phase 10: online payments (Wave and card through Modem Pay, crypto through NOWPayments)
-- with automatic clearance. Run this ONCE in the Supabase SQL Editor (after the Phase 9 SQL).

-- =====================================================================
-- 1. How was each student cleared?
-- =====================================================================
alter table public.profiles
  add column cleared_via text
    check (cleared_via in ('manual', 'whatsapp', 'wave', 'card', 'crypto'));

update public.profiles set cleared_via = 'manual' where payment_status = 'cleared';

-- Admin Clear / Unclear button (same as before, now also remembers how).
create or replace function public.set_payment_status(target uuid, new_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not allowed';
  end if;
  if new_status not in ('pending', 'cleared') then
    raise exception 'Invalid status';
  end if;

  update public.profiles
  set payment_status = new_status,
      cleared_at = case when new_status = 'cleared' then now() else null end,
      cleared_by = case when new_status = 'cleared' then auth.uid() else null end,
      cleared_via = case when new_status = 'cleared' then 'manual' else null end
  where id = target;
end;
$$;

-- =====================================================================
-- 2. Payments and the raw messages the payment companies send us
-- =====================================================================
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  method text not null check (method in ('wave', 'card', 'crypto')),
  provider text not null check (provider in ('modempay', 'nowpayments', 'mock')),
  provider_ref text,
  checkout_url text,
  amount_gmd int not null check (amount_gmd > 0),
  amount_usd numeric(12, 2),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'expired', 'cancelled', 'underpaid')),
  note text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create unique index payments_provider_ref_idx
  on public.payments (provider, provider_ref) where provider_ref is not null;
create index payments_user_idx on public.payments (user_id, created_at desc);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_type text,
  payment_id uuid references public.payments (id) on delete set null,
  handled boolean not null default false,
  outcome text,
  payload jsonb,
  created_at timestamptz not null default now()
);
create index payment_events_created_idx on public.payment_events (created_at desc);

alter table public.payments enable row level security;
alter table public.payment_events enable row level security;

create policy "read own payments" on public.payments
  for select to authenticated using (user_id = auth.uid());
create policy "admins read payments" on public.payments
  for select to authenticated using (public.is_admin());
create policy "admins read payment events" on public.payment_events
  for select to authenticated using (public.is_admin());
-- No write policies. Only the server (service role key) writes to these tables.

alter publication supabase_realtime add table public.payments;

-- =====================================================================
-- 3. Automatic clearance. Only the server's service role can call these.
-- =====================================================================

-- A verified "this payment succeeded" message arrived. Clears the student.
-- Safe to call twice for the same payment.
create function public.payment_mark_paid(
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

  -- Paid less than the price: keep the record, do NOT clear. An admin decides.
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

-- A failed / expired / cancelled / partly paid message. Never touches a paid payment.
create function public.payment_mark_status(p_payment uuid, p_status text, p_note text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('failed', 'expired', 'cancelled', 'underpaid') then
    raise exception 'Invalid status';
  end if;
  update public.payments
  set status = p_status,
      note = coalesce(p_note, note)
  where id = p_payment and status in ('pending', 'underpaid');
  if not found then
    return 'unchanged';
  end if;
  return 'updated';
end;
$$;

revoke all on function public.payment_mark_paid(uuid, text, numeric) from public, anon, authenticated;
revoke all on function public.payment_mark_status(uuid, text, text) from public, anon, authenticated;
grant execute on function public.payment_mark_paid(uuid, text, numeric) to service_role;
grant execute on function public.payment_mark_status(uuid, text, text) to service_role;

-- =====================================================================
-- 4. Crypto price: Dalasi per 1 US dollar (set by you in Admin > Settings)
-- =====================================================================
create function public.get_gmd_per_usd()
returns numeric
language sql
security definer
stable
set search_path = public
as $$
  select (select value::numeric from public.app_settings where key = 'gmd_per_usd');
$$;

create function public.set_gmd_per_usd(p_rate numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not allowed';
  end if;
  if p_rate is null or p_rate < 1 or p_rate > 1000 then
    raise exception 'Enter how many dalasi equal 1 US dollar (a number between 1 and 1000)';
  end if;
  insert into public.app_settings (key, value) values ('gmd_per_usd', p_rate::text)
  on conflict (key) do update set value = excluded.value;
end;
$$;

revoke all on function public.get_gmd_per_usd() from public, anon;
revoke all on function public.set_gmd_per_usd(numeric) from public, anon;
grant execute on function public.get_gmd_per_usd() to authenticated, service_role;
grant execute on function public.set_gmd_per_usd(numeric) to authenticated;
