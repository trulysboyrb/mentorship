-- Phase 22: in-person group sign-ups, batch numbers, and the new settings.
-- Run once in the Supabase SQL Editor (after the Phase 21 SQL). Safe to run twice.

-- 1. A new learning mode "group" (a group signs up for in person together, one person pays once).
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.profiles'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%learning_mode%'
  loop
    execute format('alter table public.profiles drop constraint %I', c.conname);
  end loop;
  alter table public.profiles
    add constraint profiles_learning_mode_check check (learning_mode in ('online', 'in_person', 'group'));
end $$;

alter table public.profiles add column if not exists batch int;
alter table public.profiles add column if not exists group_size int;
do $$ begin
  alter table public.profiles add constraint profiles_group_size_check check (group_size is null or group_size between 2 and 50);
exception when duplicate_object then null; end $$;

-- 2. The other people in a group (the person who signed up and pays is the leader and is not repeated here).
create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid not null references public.profiles (id) on delete cascade,
  position int not null default 1,
  full_name text not null check (length(full_name) between 2 and 80),
  whatsapp text not null check (length(whatsapp) between 6 and 20),
  created_at timestamptz not null default now()
);
create index if not exists group_members_leader_idx on public.group_members (leader_id, position);
alter table public.group_members enable row level security;
drop policy if exists "leader reads own group" on public.group_members;
drop policy if exists "admins read all groups" on public.group_members;
create policy "leader reads own group" on public.group_members for select to authenticated using (leader_id = auth.uid());
create policy "admins read all groups" on public.group_members for select to authenticated using (public.is_admin());
grant select on public.group_members to authenticated;
-- No insert, update or delete policy on purpose: groups are only created by the sign-up trigger below.

-- 3. New settings (starting values; change them in Admin > Settings).
insert into public.app_settings (key, value) values ('price_group', '50000') on conflict (key) do nothing;
insert into public.app_settings (key, value) values ('current_batch', '1') on conflict (key) do nothing;
insert into public.app_settings (key, value) values ('group_size_max', '10') on conflict (key) do nothing;

-- Students who were already in person before this update go into the current batch.
update public.profiles set batch = 1 where learning_mode = 'in_person' and batch is null;

-- 4. Public status: adds the group price, current batch and group size limit.
create or replace function public.site_status()
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
    'price_online',     coalesce((select value::int from public.app_settings where key = 'price_online'), 7000),
    'price_in_person',  coalesce((select value::int from public.app_settings where key = 'price_in_person'), 10000),
    'price_group',      coalesce((select value::int from public.app_settings where key = 'price_group'), 50000),
    'current_batch',    coalesce((select value::int from public.app_settings where key = 'current_batch'), 1),
    'group_max',        coalesce((select value::int from public.app_settings where key = 'group_size_max'), 10),
    'referral_percent', coalesce((select value::int from public.app_settings where key = 'referral_percent'), 5),
    'pay_wave',         coalesce((select value from public.app_settings where key = 'pay_wave_on'), '1') = '1',
    'pay_card',         coalesce((select value from public.app_settings where key = 'pay_card_on'), '1') = '1',
    'pay_crypto',       coalesce((select value from public.app_settings where key = 'pay_crypto_on'), '1') = '1',
    'pay_whatsapp',     coalesce((select value from public.app_settings where key = 'pay_whatsapp_on'), '1') = '1',
    'signups_open',     coalesce((select value from public.app_settings where key = 'signups_open'), '1') = '1',
    'maintenance',      coalesce((select value from public.app_settings where key = 'maintenance_on'), '0') = '1',
    'banner_on',        coalesce((select value from public.app_settings where key = 'banner_on'), '0') = '1',
    'banner_text',      coalesce((select value from public.app_settings where key = 'banner_text'), ''),
    'banner_tone',      coalesce((select value from public.app_settings where key = 'banner_tone'), 'info'),
    'contact_whatsapp', coalesce((select value from public.app_settings where key = 'contact_whatsapp'), ''),
    'contact_email',    coalesce((select value from public.app_settings where key = 'contact_email'), ''),
    'contact_business', coalesce((select value from public.app_settings where key = 'contact_business'), 'The Forbes Academy'),
    'contact_hours',    coalesce((select value from public.app_settings where key = 'contact_hours'), ''),
    'local_prices_on',  coalesce((select value from public.app_settings where key = 'local_prices_on'), '1') = '1',
    'gmd_per_usd',      (select case when value ~ '^[0-9]+(\.[0-9]+)?$' then (case when value::numeric > 0 then value::numeric end) end
                         from public.app_settings where key = 'gmd_per_usd'),
    'is_admin',         coalesce(public.is_admin(), false)
  );
$$;

-- 5. Admin save: same checks as before, plus the three new settings.
create or replace function public.admin_save_site_settings(p jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  k text;
  v text;
  n int;
begin
  if not public.is_admin() then
    raise exception 'Not allowed';
  end if;
  if p is null or jsonb_typeof(p) <> 'object' then
    raise exception 'Nothing to save';
  end if;

  for k in select jsonb_object_keys(p) loop
    if jsonb_typeof(p -> k) not in ('string', 'number') then
      raise exception 'Bad value for %', k;
    end if;
    v := p ->> k;
    if k in ('price_online', 'price_in_person', 'price_group') then
      if v is null or v !~ '^[0-9]{1,7}$' then
        raise exception 'Price must be a whole number of dalasi';
      end if;
      n := v::int;
      if n < 1 or n > 1000000 then
        raise exception 'Price must be between 1 and 1,000,000';
      end if;
      v := n::text;
    elsif k = 'current_batch' then
      if v is null or v !~ '^[0-9]{1,4}$' then
        raise exception 'Batch number must be a whole number from 1 to 9999';
      end if;
      n := v::int;
      if n < 1 then
        raise exception 'Batch number must be at least 1';
      end if;
      v := n::text;
    elsif k = 'group_size_max' then
      if v is null or v !~ '^[0-9]{1,2}$' then
        raise exception 'Group size must be a whole number from 2 to 50';
      end if;
      n := v::int;
      if n < 2 or n > 50 then
        raise exception 'Group size must be from 2 to 50 people';
      end if;
      v := n::text;
    elsif k = 'referral_percent' then
      if v is null or v !~ '^[0-9]{1,2}$' then
        raise exception 'Referral discount must be a whole number from 0 to 50';
      end if;
      n := v::int;
      if n > 50 then
        raise exception 'Referral discount can not be more than 50%%';
      end if;
      v := n::text;
    elsif k in ('pay_wave_on', 'pay_card_on', 'pay_crypto_on', 'pay_whatsapp_on', 'signups_open', 'maintenance_on',
                'banner_on', 'local_prices_on', 'alert_payment_on', 'alert_underpaid_on', 'alert_payout_on') then
      if v not in ('0', '1') then
        raise exception 'Switch values must be 0 or 1';
      end if;
    elsif k = 'banner_text' then
      v := btrim(coalesce(v, ''));
      if length(v) > 200 then
        raise exception 'The banner message can be at most 200 characters';
      end if;
    elsif k = 'banner_tone' then
      if v not in ('info', 'success', 'warning') then
        raise exception 'Banner colour must be info, success or warning';
      end if;
    elsif k = 'contact_whatsapp' then
      v := coalesce(v, '');
      if v <> '' and v !~ '^[0-9]{6,15}$' then
        raise exception 'WhatsApp number must be digits only, with the country code (6 to 15 digits)';
      end if;
    elsif k in ('contact_email', 'alert_email') then
      v := btrim(coalesce(v, ''));
      if v <> '' and (length(v) > 120 or v !~ '^[^@[:space:]]{1,64}@[^@[:space:]]+\.[^@[:space:]]{2,}$') then
        raise exception 'That email address does not look right';
      end if;
    elsif k = 'contact_business' then
      v := btrim(coalesce(v, ''));
      if length(v) < 2 or length(v) > 80 then
        raise exception 'Business name must be 2 to 80 characters';
      end if;
    elsif k = 'contact_hours' then
      v := btrim(coalesce(v, ''));
      if length(v) > 120 then
        raise exception 'Opening hours text can be at most 120 characters';
      end if;
    elsif k = 'cert_template_path' then
      v := coalesce(v, '');
      if v <> '' and v !~ '^template-[0-9]{10,16}\.(png|jpg|pdf)$' then
        raise exception 'Bad certificate template file name';
      end if;
    elsif k = 'cert_layout' then
      v := coalesce(v, '');
      if v <> '' then
        if length(v) > 4000 then
          raise exception 'Certificate layout is too long';
        end if;
        begin
          if jsonb_typeof(v::jsonb) <> 'object' then
            raise exception 'Certificate layout must be an object';
          end if;
        exception when invalid_text_representation or others then
          raise exception 'Certificate layout is not valid';
        end;
      end if;
    else
      raise exception 'Unknown setting: %', k;
    end if;

    insert into public.app_settings (key, value) values (k, v)
    on conflict (key) do update set value = excluded.value;
  end loop;
end;
$$;

revoke all on function public.site_status() from public;
revoke all on function public.admin_save_site_settings(jsonb) from public, anon;
grant execute on function public.site_status() to anon, authenticated;
grant execute on function public.admin_save_site_settings(jsonb) to authenticated;

-- 6. New sign-ups: also handles in person / group, the batch number and the group's member list.
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
  mode text := case when meta->>'learning_mode' in ('online', 'in_person', 'group') then meta->>'learning_mode' end;
  cur_batch int := coalesce((select case when value ~ '^[0-9]{1,4}$' then value::int end from public.app_settings where key = 'current_batch'), 1);
  gmax int := coalesce((select case when value ~ '^[0-9]{1,2}$' then value::int end from public.app_settings where key = 'group_size_max'), 10);
  gm jsonb := case when jsonb_typeof(meta->'group_members') = 'array' then meta->'group_members' else '[]'::jsonb end;
  extras int := 0;
  m jsonb;
  pos int := 0;
  mname text;
  mwa text;
begin
  if ref_code <> '' then
    select id into ref_id
    from public.profiles
    where referral_code = ref_code
      and (payment_status = 'cleared' or role = 'admin');
  end if;

  if mode = 'group' then
    extras := jsonb_array_length(gm);
    if extras < 1 then
      raise exception 'A group needs at least 2 people';
    end if;
    if extras + 1 > gmax then
      raise exception 'A group can have at most % people', gmax;
    end if;
  end if;

  insert into public.profiles
    (id, email, full_name, whatsapp, country, learning_mode, experience, heard_from,
     referral_code, referred_by, referral_discount, batch, group_size)
  values (
    new.id,
    new.email,
    coalesce(meta->>'full_name', ''),
    nullif(meta->>'whatsapp', ''),
    nullif(meta->>'country', ''),
    mode,
    case when meta->>'experience' in ('beginner', 'intermediate', 'experienced') then meta->>'experience' end,
    nullif(meta->>'heard_from', ''),
    public.generate_referral_code(),
    ref_id,
    ref_id is not null,
    case when mode in ('in_person', 'group') then cur_batch end,
    case when mode = 'group' then extras + 1 end
  );

  if mode = 'group' then
    for m in select * from jsonb_array_elements(gm) loop
      mname := btrim(coalesce(m->>'name', ''));
      mwa := btrim(coalesce(m->>'whatsapp', ''));
      if length(mname) < 2 or length(mname) > 80 then
        raise exception 'Every person in the group needs a name';
      end if;
      if mwa !~ '^[0-9+][0-9 +()-]{5,19}$' then
        raise exception 'Every person in the group needs a valid WhatsApp number';
      end if;
      pos := pos + 1;
      insert into public.group_members (leader_id, position, full_name, whatsapp)
      values (new.id, pos, mname, mwa);
    end loop;
  end if;
  return new;
end;
$$;

-- 7. Profile page: a student can not switch into or out of a group, and once cleared the mode is locked
-- (so an in-person student can not switch to online to get the videos).
create or replace function public.update_my_profile(
  p_full_name text,
  p_whatsapp text,
  p_country text,
  p_learning_mode text,
  p_experience text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cur public.profiles%rowtype;
  new_mode text;
  cur_batch int := coalesce((select case when value ~ '^[0-9]{1,4}$' then value::int end from public.app_settings where key = 'current_batch'), 1);
begin
  if auth.uid() is null then
    raise exception 'Not logged in';
  end if;
  if length(trim(coalesce(p_full_name, ''))) < 2 then
    raise exception 'Please enter your full name';
  end if;
  if p_learning_mode is null or p_learning_mode not in ('online', 'in_person') then
    raise exception 'Invalid learning mode';
  end if;
  if p_experience is null or p_experience not in ('beginner', 'intermediate', 'experienced') then
    raise exception 'Invalid experience level';
  end if;

  select * into cur from public.profiles where id = auth.uid();
  if cur.learning_mode = 'group' or cur.payment_status = 'cleared' then
    new_mode := cur.learning_mode;
  else
    new_mode := p_learning_mode;
  end if;

  update public.profiles
  set full_name = trim(p_full_name),
      whatsapp = nullif(trim(coalesce(p_whatsapp, '')), ''),
      country = nullif(trim(coalesce(p_country, '')), ''),
      learning_mode = new_mode,
      batch = case when new_mode in ('in_person', 'group') then coalesce(cur.batch, cur_batch) else null end,
      experience = p_experience
  where id = auth.uid();
end;
$$;

revoke all on function public.update_my_profile(text, text, text, text, text) from public, anon;
grant execute on function public.update_my_profile(text, text, text, text, text) to authenticated;
