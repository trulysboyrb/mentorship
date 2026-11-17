-- Phase 18: site-wide banner and contact details (Contact Us).
-- Run once in the Supabase SQL Editor (after the Phase 17 SQL).

-- =====================================================================
-- 1. New settings (kept in app_settings, admins only). Public ones are exposed by site_status().
-- =====================================================================
insert into public.app_settings (key, value) values
  ('banner_on', '0'),
  ('banner_text', ''),
  ('banner_tone', 'info'),
  ('contact_whatsapp', ''),
  ('contact_email', ''),
  ('contact_business', 'ApexTrade Academy'),
  ('contact_hours', '')
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
    'banner_on',        coalesce((select value from public.app_settings where key = 'banner_on'), '0') = '1',
    'banner_text',      coalesce((select value from public.app_settings where key = 'banner_text'), ''),
    'banner_tone',      coalesce((select value from public.app_settings where key = 'banner_tone'), 'info'),
    'contact_whatsapp', coalesce((select value from public.app_settings where key = 'contact_whatsapp'), ''),
    'contact_email',    coalesce((select value from public.app_settings where key = 'contact_email'), ''),
    'contact_business', coalesce((select value from public.app_settings where key = 'contact_business'), 'ApexTrade Academy'),
    'contact_hours',    coalesce((select value from public.app_settings where key = 'contact_hours'), ''),
    'is_admin',         coalesce(public.is_admin(), false)
  );
$$;

-- Same function as Phase 17, now also validating the new keys.
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
    elsif k in ('pay_wave_on', 'pay_card_on', 'pay_crypto_on', 'pay_whatsapp_on', 'signups_open', 'maintenance_on',
                'banner_on') then
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
    elsif k = 'contact_email' then
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

