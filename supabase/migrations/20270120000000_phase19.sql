-- Phase 19: certificate template, activity log, admin alerts.
-- Run once in the Supabase SQL Editor (after the Phase 17 and Phase 18 SQL).

-- =====================================================================
-- 1. New settings (kept in app_settings, admins only). Public ones are exposed by site_status().
-- =====================================================================
insert into public.app_settings (key, value) values
  ('cert_template_path', ''),
  ('cert_layout', ''),
  ('alert_payment_on', '1'),
  ('alert_underpaid_on', '1'),
  ('alert_payout_on', '1'),
  ('alert_email', '')
on conflict (key) do nothing;

-- Admin-only settings (not shown to students): certificate template and alert preferences.
create or replace function public.admin_get_settings()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not allowed';
  end if;
  return jsonb_build_object(
    'cert_template_path', coalesce((select value from public.app_settings where key = 'cert_template_path'), ''),
    'cert_layout',        coalesce((select value from public.app_settings where key = 'cert_layout'), ''),
    'alert_payment_on',   coalesce((select value from public.app_settings where key = 'alert_payment_on'), '1') = '1',
    'alert_underpaid_on', coalesce((select value from public.app_settings where key = 'alert_underpaid_on'), '1') = '1',
    'alert_payout_on',    coalesce((select value from public.app_settings where key = 'alert_payout_on'), '1') = '1',
    'alert_email',        coalesce((select value from public.app_settings where key = 'alert_email'), '')
  );
end;
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
                'banner_on', 'alert_payment_on', 'alert_underpaid_on', 'alert_payout_on') then
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

revoke all on function public.admin_get_settings() from public, anon;
revoke all on function public.admin_save_site_settings(jsonb) from public, anon;
grant execute on function public.admin_get_settings() to authenticated;
grant execute on function public.admin_save_site_settings(jsonb) to authenticated;

-- =====================================================================
-- 2. Certificate template storage (admins only; the admin's browser builds the PDF)
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('certificate-templates', 'certificate-templates', false, 8388608,
        array['image/png', 'image/jpeg', 'application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = 8388608,
      allowed_mime_types = array['image/png', 'image/jpeg', 'application/pdf'];

drop policy if exists "admin read cert templates" on storage.objects;
drop policy if exists "admin upload cert templates" on storage.objects;
drop policy if exists "admin update cert templates" on storage.objects;
drop policy if exists "admin delete cert templates" on storage.objects;
create policy "admin read cert templates" on storage.objects
  for select to authenticated using (bucket_id = 'certificate-templates' and public.is_admin());
create policy "admin upload cert templates" on storage.objects
  for insert to authenticated with check (bucket_id = 'certificate-templates' and public.is_admin());
create policy "admin update cert templates" on storage.objects
  for update to authenticated using (bucket_id = 'certificate-templates' and public.is_admin())
  with check (bucket_id = 'certificate-templates' and public.is_admin());
create policy "admin delete cert templates" on storage.objects
  for delete to authenticated using (bucket_id = 'certificate-templates' and public.is_admin());

-- =====================================================================
-- 3. Activity log (who did what, and when). Written only by database triggers.
-- =====================================================================
create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  actor_name text not null default 'System',
  action text not null,
  target_id uuid,
  target_label text,
  detail jsonb not null default '{}'::jsonb
);
create index if not exists admin_audit_log_at_idx on public.admin_audit_log (at desc);

alter table public.admin_audit_log enable row level security;
drop policy if exists "admins read audit log" on public.admin_audit_log;
create policy "admins read audit log" on public.admin_audit_log
  for select to authenticated using (public.is_admin());
-- No insert / update / delete policies on purpose: nobody can edit or erase the log from the app.

create or replace function public.log_audit(p_action text, p_actor uuid, p_target uuid, p_label text, p_detail jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  who text;
begin
  select full_name into who from public.profiles where id = p_actor;
  insert into public.admin_audit_log (actor, actor_name, action, target_id, target_label, detail)
  values (p_actor, case when p_actor is null then 'Automatic' else coalesce(nullif(who, ''), 'Admin') end,
          p_action, p_target, p_label, coalesce(p_detail, '{}'::jsonb));
end;
$$;
revoke all on function public.log_audit(text, uuid, uuid, text, jsonb) from public, anon, authenticated;

-- Clear / lock a student (also automatic clearing by a payment: actor is empty = "Automatic").
create or replace function public.trg_audit_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.payment_status is distinct from old.payment_status then
    perform public.log_audit(
      case when new.payment_status = 'cleared' then 'student.cleared' else 'student.locked' end,
      auth.uid(), new.id, coalesce(nullif(new.full_name, ''), new.email),
      jsonb_build_object('via', new.cleared_via));
  end if;
  if new.role is distinct from old.role then
    perform public.log_audit('role.changed', auth.uid(), new.id, coalesce(nullif(new.full_name, ''), new.email),
      jsonb_build_object('from', old.role, 'to', new.role));
  end if;
  return new;
end;
$$;
drop trigger if exists audit_profile on public.profiles;
create trigger audit_profile after update of payment_status, role on public.profiles
  for each row execute function public.trg_audit_profile();

create or replace function public.trg_audit_certificate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nm text;
begin
  if tg_op = 'INSERT' then
    select coalesce(nullif(full_name, ''), email) into nm from public.profiles where id = new.user_id;
    perform public.log_audit('certificate.issued', coalesce(auth.uid(), new.issued_by), new.user_id, nm,
      jsonb_build_object('title', new.title, 'serial', new.serial));
    return new;
  end if;
  select coalesce(nullif(full_name, ''), email) into nm from public.profiles where id = old.user_id;
  perform public.log_audit('certificate.removed', auth.uid(), old.user_id, nm, jsonb_build_object('title', old.title));
  return old;
end;
$$;
drop trigger if exists audit_certificate on public.certificates;
create trigger audit_certificate after insert or delete on public.certificates
  for each row execute function public.trg_audit_certificate();

-- Settings changes (prices, switches, banner ...). Long values (certificate layout) are not copied.
create or replace function public.trg_audit_setting()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.value is not distinct from old.value then
    return new;
  end if;
  perform public.log_audit('setting.changed', auth.uid(), null, new.key,
    case
      when new.key in ('cert_layout') then jsonb_build_object('note', 'changed')
      else jsonb_build_object('from', left(case when tg_op = 'UPDATE' then old.value end, 80), 'to', left(new.value, 80))
    end);
  return new;
end;
$$;
drop trigger if exists audit_setting on public.app_settings;
create trigger audit_setting after insert or update on public.app_settings
  for each row execute function public.trg_audit_setting();

-- Payout decisions.
create or replace function public.trg_audit_payout()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nm text;
begin
  if new.status is distinct from old.status and new.status in ('paid', 'rejected') then
    select coalesce(nullif(full_name, ''), email) into nm from public.profiles where id = new.user_id;
    perform public.log_audit('payout.' || new.status, coalesce(auth.uid(), new.resolved_by), new.user_id, nm,
      jsonb_build_object('amount', new.amount));
  end if;
  return new;
end;
$$;
drop trigger if exists audit_payout on public.payout_requests;
create trigger audit_payout after update of status on public.payout_requests
  for each row execute function public.trg_audit_payout();

-- Student deleted (the delete route writes this record, with who did it).
create or replace function public.trg_audit_deleted_student()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.log_audit('student.deleted', new.deleted_by, null, coalesce(nullif(new.full_name, ''), new.email),
    jsonb_build_object('email', new.email, 'was_cleared', new.was_cleared));
  return new;
end;
$$;
drop trigger if exists audit_deleted_student on public.deleted_students;
create trigger audit_deleted_student after insert on public.deleted_students
  for each row execute function public.trg_audit_deleted_student();

-- =====================================================================
-- 4. Alerts for the admin (a bell in the admin menu). Created by triggers, shown live.
-- =====================================================================
create table if not exists public.admin_alerts (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  kind text not null check (kind in ('payment', 'underpaid', 'payout')),
  title text not null,
  body text,
  link text,
  read_at timestamptz
);
create index if not exists admin_alerts_unread_idx on public.admin_alerts (at desc) where read_at is null;

alter table public.admin_alerts enable row level security;
drop policy if exists "admins read alerts" on public.admin_alerts;
create policy "admins read alerts" on public.admin_alerts
  for select to authenticated using (public.is_admin());

do $$ begin
  alter publication supabase_realtime add table public.admin_alerts;
exception when duplicate_object then null; when undefined_object then null; end $$;

create or replace function public.alert_enabled(p_key text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select value from public.app_settings where key = p_key), '1') = '1';
$$;
revoke all on function public.alert_enabled(text) from public, anon, authenticated;

create or replace function public.trg_alert_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nm text;
begin
  if new.provider = 'mock' then
    return new; -- test payments never alert
  end if;
  if new.status = 'paid' and (tg_op = 'INSERT' or old.status is distinct from 'paid') and public.alert_enabled('alert_payment_on') then
    select coalesce(nullif(full_name, ''), email, 'A student') into nm from public.profiles where id = new.user_id;
    insert into public.admin_alerts (kind, title, body, link)
    values ('payment', 'New payment', coalesce(nm, 'A student') || ' paid D' || new.amount_gmd || ' via ' || initcap(new.method), '/admin/payments');
  elsif new.status = 'underpaid' and (tg_op = 'INSERT' or old.status is distinct from 'underpaid') and public.alert_enabled('alert_underpaid_on') then
    select coalesce(nullif(full_name, ''), email, 'A student') into nm from public.profiles where id = new.user_id;
    insert into public.admin_alerts (kind, title, body, link)
    values ('underpaid', 'Underpaid payment', coalesce(nm, 'A student') || ' paid less than D' || new.amount_gmd || ' via ' || initcap(new.method) || '. Please check.', '/admin/payments');
  end if;
  return new;
end;
$$;
drop trigger if exists alert_payment on public.payments;
create trigger alert_payment after insert or update of status on public.payments
  for each row execute function public.trg_alert_payment();

create or replace function public.trg_alert_payout()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nm text;
begin
  if public.alert_enabled('alert_payout_on') then
    select coalesce(nullif(full_name, ''), email, 'A student') into nm from public.profiles where id = new.user_id;
    insert into public.admin_alerts (kind, title, body, link)
    values ('payout', 'Payout request', coalesce(nm, 'A student') || ' asked to cash out D' || new.amount, '/admin/payouts');
  end if;
  return new;
end;
$$;
drop trigger if exists alert_payout on public.payout_requests;
create trigger alert_payout after insert on public.payout_requests
  for each row execute function public.trg_alert_payout();

create or replace function public.admin_unread_alerts()
returns int
language sql
security definer
stable
set search_path = public
as $$
  select case when public.is_admin() then (select count(*)::int from public.admin_alerts where read_at is null) else 0 end;
$$;

create or replace function public.admin_mark_alerts_read()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not allowed';
  end if;
  update public.admin_alerts set read_at = now() where read_at is null;
end;
$$;
revoke all on function public.admin_unread_alerts() from public, anon;
revoke all on function public.admin_mark_alerts_read() from public, anon;
grant execute on function public.admin_unread_alerts() to authenticated;
grant execute on function public.admin_mark_alerts_read() to authenticated;

