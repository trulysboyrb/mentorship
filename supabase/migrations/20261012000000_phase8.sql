-- Phase 8: device limit, referral codes, app settings, admin analytics.

-- =====================================================================
-- App settings (small key/value table, admins only)
-- =====================================================================
create table public.app_settings (
  key text primary key,
  value text not null
);

alter table public.app_settings enable row level security;

create policy "admins read settings" on public.app_settings
  for select to authenticated using (public.is_admin());
-- No write policy on purpose: changes go through set_max_devices().

insert into public.app_settings (key, value) values ('max_devices', '2');

create function public.max_devices()
returns int
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select value::int from public.app_settings where key = 'max_devices'), 2);
$$;

create function public.set_max_devices(p_n int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not allowed';
  end if;
  if p_n is null or p_n < 1 or p_n > 5 then
    raise exception 'Choose a number between 1 and 5';
  end if;
  insert into public.app_settings (key, value) values ('max_devices', p_n::text)
  on conflict (key) do update set value = excluded.value;
end;
$$;

revoke all on function public.max_devices() from public, anon;
revoke all on function public.set_max_devices(int) from public, anon;
grant execute on function public.max_devices() to authenticated;
grant execute on function public.set_max_devices(int) to authenticated;

-- =====================================================================
-- Device limit (account sharing)
-- =====================================================================
create table public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  device_token text not null,
  label text not null default 'Unknown device',
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  unique (user_id, device_token)
);

-- RLS on with NO policies: nobody can read or write this table directly.
-- Everything goes through the functions below (so device tokens never leave the server).
alter table public.user_devices enable row level security;

alter table public.profiles add column last_device_reset_at timestamptz;

-- Called by the server on each page load for a cleared student.
-- Returns 'ok' or 'limit'. Admins and students who have not paid are never limited.
-- A device unused for 60 days stops counting towards the limit.
create function public.register_device(p_token text, p_label text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  existing public.user_devices%rowtype;
  active_count int;
  v_label text := left(coalesce(nullif(trim(p_label), ''), 'Unknown device'), 80);
begin
  if uid is null then
    return 'none';
  end if;
  if p_token is null or length(p_token) < 16 or length(p_token) > 80 then
    raise exception 'Invalid device';
  end if;
  if public.is_admin() or not public.is_cleared() then
    return 'ok';
  end if;

  -- One registration at a time per person, so two tabs cannot both squeeze in.
  perform pg_advisory_xact_lock(hashtext(uid::text));

  select * into existing
  from public.user_devices
  where user_id = uid and device_token = p_token;

  if found and existing.last_seen > now() - interval '60 days' then
    if existing.last_seen < now() - interval '1 minute' then
      update public.user_devices set last_seen = now(), label = v_label where id = existing.id;
    end if;
    return 'ok';
  end if;

  select count(*) into active_count
  from public.user_devices
  where user_id = uid
    and last_seen > now() - interval '60 days'
    and device_token <> p_token;

  if active_count >= public.max_devices() then
    return 'limit';
  end if;

  insert into public.user_devices (user_id, device_token, label)
  values (uid, p_token, v_label)
  on conflict (user_id, device_token)
  do update set last_seen = now(), label = excluded.label;

  return 'ok';
end;
$$;

create function public.list_my_devices(p_token text)
returns table (id uuid, label text, first_seen timestamptz, last_seen timestamptz, is_current boolean)
language sql
security definer
stable
set search_path = public
as $$
  select d.id, d.label, d.first_seen, d.last_seen, (d.device_token = p_token)
  from public.user_devices d
  where d.user_id = auth.uid()
    and d.last_seen > now() - interval '60 days'
  order by d.last_seen desc;
$$;

-- A student may remove one of their OTHER devices, at most once every 7 days.
create function public.remove_my_device(p_id uuid, p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  target public.user_devices%rowtype;
  last_reset timestamptz;
begin
  if uid is null then
    raise exception 'Not logged in';
  end if;

  select * into target from public.user_devices where id = p_id and user_id = uid;
  if not found then
    raise exception 'Device not found';
  end if;
  if target.device_token = p_token then
    raise exception 'You cannot remove the device you are using right now';
  end if;

  select last_device_reset_at into last_reset from public.profiles where id = uid;
  if last_reset is not null and last_reset > now() - interval '7 days' then
    raise exception 'You can remove one device every 7 days. Message us on WhatsApp if you need help sooner.';
  end if;

  delete from public.user_devices where id = target.id;
  update public.profiles set last_device_reset_at = now() where id = uid;
end;
$$;

create function public.admin_list_devices(p_user uuid)
returns table (id uuid, label text, first_seen timestamptz, last_seen timestamptz)
language sql
security definer
stable
set search_path = public
as $$
  select d.id, d.label, d.first_seen, d.last_seen
  from public.user_devices d
  where public.is_admin() and d.user_id = p_user
  order by d.last_seen desc;
$$;

create function public.admin_reset_devices(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not allowed';
  end if;
  delete from public.user_devices where user_id = p_user;
  update public.profiles set last_device_reset_at = null where id = p_user;
end;
$$;

revoke all on function public.register_device(text, text) from public, anon;
revoke all on function public.list_my_devices(text) from public, anon;
revoke all on function public.remove_my_device(uuid, text) from public, anon;
revoke all on function public.admin_list_devices(uuid) from public, anon;
revoke all on function public.admin_reset_devices(uuid) from public, anon;
grant execute on function public.register_device(text, text) to authenticated;
grant execute on function public.list_my_devices(text) to authenticated;
grant execute on function public.remove_my_device(uuid, text) to authenticated;
grant execute on function public.admin_list_devices(uuid) to authenticated;
grant execute on function public.admin_reset_devices(uuid) to authenticated;

-- =====================================================================
-- Referral codes (5% discount, shown in the app and handled by you on WhatsApp)
-- =====================================================================
alter table public.profiles add column referral_code text unique;
alter table public.profiles add column referred_by uuid references public.profiles (id) on delete set null;
alter table public.profiles add column referral_discount boolean not null default false;

-- 6 characters from an alphabet without look-alikes (no 0/O, 1/I).
create function public.generate_referral_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where referral_code = code);
  end loop;
  return code;
end;
$$;

-- Give every existing account a code (one at a time so codes can never collide).
do $$
declare r record;
begin
  for r in select id from public.profiles where referral_code is null loop
    update public.profiles set referral_code = public.generate_referral_code() where id = r.id;
  end loop;
end;
$$;

alter table public.profiles alter column referral_code set not null;

-- Codes only work if they belong to a student who has PAID (or to an admin).
-- This stops people making a free throwaway account just to get a discount.
create function public.check_referral_code(p_code text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where referral_code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'))
      and (payment_status = 'cleared' or role = 'admin')
  );
$$;

revoke all on function public.check_referral_code(text) from public;
grant execute on function public.check_referral_code(text) to anon, authenticated;

create function public.my_referral_stats()
returns table (total int, paid int)
language sql
security definer
stable
set search_path = public
as $$
  select count(*)::int, (count(*) filter (where payment_status = 'cleared'))::int
  from public.profiles
  where referred_by = auth.uid();
$$;

revoke all on function public.my_referral_stats() from public, anon;
grant execute on function public.my_referral_stats() to authenticated;

-- New sign-ups: create the profile, give it its own code, and record who referred it.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  ref_code text := upper(regexp_replace(coalesce(meta->>'referral_code', ''), '[^A-Za-z0-9]', '', 'g'));
  ref_id uuid;
begin
  if ref_code <> '' then
    select id into ref_id
    from public.profiles
    where referral_code = ref_code
      and (payment_status = 'cleared' or role = 'admin');
  end if;

  insert into public.profiles
    (id, email, full_name, whatsapp, country, learning_mode, experience, heard_from,
     referral_code, referred_by, referral_discount)
  values (
    new.id,
    new.email,
    coalesce(meta->>'full_name', ''),
    nullif(meta->>'whatsapp', ''),
    nullif(meta->>'country', ''),
    case when meta->>'learning_mode' in ('online', 'in_person') then meta->>'learning_mode' end,
    case when meta->>'experience' in ('beginner', 'intermediate', 'experienced') then meta->>'experience' end,
    nullif(meta->>'heard_from', ''),
    public.generate_referral_code(),
    ref_id,
    ref_id is not null
  );
  return new;
end;
$$;

-- =====================================================================
-- Admin analytics (one call, admins only)
-- =====================================================================
create function public.admin_analytics()
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
  students as (select * from public.profiles where role = 'student'),
  req as (
    select lesson_id from public.lesson_content
    where video_path is not null or video_url is not null
  ),
  tot as (select count(*) as n from req),
  finished as (
    select s.id from students s
    where (select n from tot) > 0
      and (
        select count(*) from public.lesson_progress lp
        join req r on r.lesson_id = lp.lesson_id
        where lp.user_id = s.id and lp.completed
      ) >= (select n from tot)
  )
  select jsonb_build_object(
    'totals', jsonb_build_object(
      'students', (select count(*) from students),
      'cleared', (select count(*) from students where payment_status = 'cleared'),
      'started', (
        select count(distinct lp.user_id) from public.lesson_progress lp
        join students s on s.id = lp.user_id
        where lp.watched_seconds > 0 and s.payment_status = 'cleared'
      ),
      'finished', (select count(*) from finished),
      'certified', (
        select count(distinct c.user_id) from public.certificates c
        join students s on s.id = c.user_id
      )
    ),
    'weeks', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'week', wk.week_start,
        'signups', coalesce(su.n, 0),
        'paid', coalesce(pa.n, 0)
      ) order by wk.week_start), '[]'::jsonb)
      from (
        select w::date as week_start
        from generate_series(
          date_trunc('week', now()) - interval '11 weeks',
          date_trunc('week', now()),
          interval '1 week'
        ) w
      ) wk
      left join (
        select date_trunc('week', created_at)::date as wk, count(*) as n
        from students group by 1
      ) su on su.wk = wk.week_start
      left join (
        select date_trunc('week', cleared_at)::date as wk, count(*) as n
        from students where cleared_at is not null group by 1
      ) pa on pa.wk = wk.week_start
    ),
    'lessons', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', l.id,
        'title', l.title,
        'module', m.position,
        'position', l.position,
        'has_video', exists (select 1 from req r where r.lesson_id = l.id),
        'started', (
          select count(*) from public.lesson_progress lp
          join students s on s.id = lp.user_id
          where lp.lesson_id = l.id and lp.watched_seconds > 0 and s.payment_status = 'cleared'
        ),
        'completed', (
          select count(*) from public.lesson_progress lp
          join students s on s.id = lp.user_id
          where lp.lesson_id = l.id and lp.completed and s.payment_status = 'cleared'
        )
      ) order by m.position, l.position), '[]'::jsonb)
      from public.lessons l
      join public.modules m on m.id = l.module_id
    ),
    'sources', (
      select coalesce(jsonb_agg(jsonb_build_object('k', k, 'n', n) order by n desc), '[]'::jsonb)
      from (select coalesce(heard_from, 'unknown') as k, count(*) as n from students group by 1) q
    ),
    'experience', (
      select coalesce(jsonb_agg(jsonb_build_object('k', k, 'n', n) order by n desc), '[]'::jsonb)
      from (select coalesce(experience, 'unknown') as k, count(*) as n from students group by 1) q
    ),
    'modes', (
      select coalesce(jsonb_agg(jsonb_build_object('k', k, 'n', n) order by n desc), '[]'::jsonb)
      from (select coalesce(learning_mode, 'unknown') as k, count(*) as n from students group by 1) q
    ),
    'referrers', (
      select coalesce(jsonb_agg(x order by (x->>'total')::int desc, x->>'name'), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'name', r.full_name,
          'total', count(*),
          'paid', count(*) filter (where s.payment_status = 'cleared')
        ) as x
        from students s
        join public.profiles r on r.id = s.referred_by
        group by r.id, r.full_name
        order by count(*) desc
        limit 10
      ) q
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_analytics() from public, anon;
grant execute on function public.admin_analytics() to authenticated;
