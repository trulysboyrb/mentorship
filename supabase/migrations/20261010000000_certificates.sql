-- Phase 6: certificates (PDF only), private storage, live updates.

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  file_path text not null,
  issued_at timestamptz not null default now(),
  issued_by uuid references public.profiles (id)
);

alter table public.certificates enable row level security;

-- Students see only their own certificates. Admins see and manage all.
create policy "read own certificates" on public.certificates
  for select to authenticated using (user_id = auth.uid());

create policy "admins manage certificates" on public.certificates
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Private bucket, PDF files only, 10 MB max each.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('certificates', 'certificates', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

-- Files are stored as <student id>/<file>.pdf, so a student can only open their own folder.
create policy "read own certificate files" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'certificates'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

create policy "admin upload certificate files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'certificates' and public.is_admin());

create policy "admin update certificate files" on storage.objects
  for update to authenticated
  using (bucket_id = 'certificates' and public.is_admin());

create policy "admin delete certificate files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'certificates' and public.is_admin());

-- Student's profile page updates the moment a certificate is issued.
alter publication supabase_realtime add table public.certificates;
