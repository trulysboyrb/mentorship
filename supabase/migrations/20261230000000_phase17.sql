-- Phase 17: site settings the admin can change without redeploying.
--   * course prices (online / in person) and the referral discount percentage
--   * payment method switches (Wave, Card, Crypto, WhatsApp)
--   * signups open / closed
--   * maintenance mode
-- Values live in the existing app_settings table (admins only). Everyone (including logged-out visitors)
-- reads the PUBLIC part through site_status(), which exposes nothing secret.

insert into public.app_settings (key, value) values
  ('price_online', '7000'),
  ('price_in_person', '10000'),
  ('referral_percent', '5'),
  ('pay_wave_on', '1'),
  ('pay_card_on', '1'),
  ('pay_crypto_on', '1'),
  ('pay_whatsapp_on', '1'),
  ('signups_open', '1'),
  ('maintenance_on', '0')
on conflict (key) do nothing;

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
    'referral_percent', coalesce((select value::int from public.app_settings where key = 'referral_percent'), 5),
    'pay_wave',         coalesce((select value from public.app_settings where key = 'pay_wave_on'), '1') = '1',
    'pay_card',         coalesce((select value from public.app_settings where key = 'pay_card_on'), '1') = '1',
    'pay_crypto',       coalesce((select value from public.app_settings where key = 'pay_crypto_on'), '1') = '1',
    'pay_whatsapp',     coalesce((select value from public.app_settings where key = 'pay_whatsapp_on'), '1') = '1',
    'signups_open',     coalesce((select value from public.app_settings where key = 'signups_open'), '1') = '1',
    'maintenance',      coalesce((select value from public.app_settings where key = 'maintenance_on'), '0') = '1',
    'is_admin',         coalesce(public.is_admin(), false)
  );
$$;

-- Admin: the same values, for the Settings page (no is_admin flag needed there).
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
    v := p ->> k;
    if k in ('price_online', 'price_in_person') then
      if v is null or v !~ '^[0-9]{1,7}$' then
        raise exception 'Price must be a whole number of dalasi';
      end if;
      n := v::int;
      if n < 1 or n > 1000000 then
        raise exception 'Price must be between 1 and 1,000,000';
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
    elsif k in ('pay_wave_on', 'pay_card_on', 'pay_crypto_on', 'pay_whatsapp_on', 'signups_open', 'maintenance_on') then
      if v not in ('0', '1') then
        raise exception 'Switch values must be 0 or 1';
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

-- Backstop for "signups closed": even someone calling the sign-up API directly is refused.
create or replace function public.block_signups_when_closed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce((select value from public.app_settings where key = 'signups_open'), '1') <> '1' then
    raise exception 'Signups are closed right now';
  end if;
  return new;
end;
$$;

drop trigger if exists a_block_signups_when_closed on auth.users;
create trigger a_block_signups_when_closed
  before insert on auth.users
  for each row execute function public.block_signups_when_closed();
