-- Phase 14: profile pictures.
-- Pictures live in a public "avatars" bucket (they are shown in the top bar). Each student can only
-- write inside their own folder (folder name = their user id). The browser shrinks the photo to a small
-- square first, and the bucket also enforces a size and type limit on the server side.

alter table public.profiles add column if not exists avatar_path text;

alter table public.profiles drop constraint if exists profiles_avatar_path_check;
alter table public.profiles add constraint profiles_avatar_path_check
  check (avatar_path is null or (length(avatar_path) <= 200 and avatar_path like id::text || '/%'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 1048576,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "avatars read own folder" on storage.objects;
drop policy if exists "avatars upload own folder" on storage.objects;
drop policy if exists "avatars update own folder" on storage.objects;
drop policy if exists "avatars delete own folder" on storage.objects;

create policy "avatars read own folder" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars upload own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars update own folder" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars delete own folder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Point the profile at an uploaded picture (or clear it with null). Only the owner, only their own folder.
create or replace function public.set_my_avatar(p_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not logged in';
  end if;
  if p_path is not null then
    if p_path not like auth.uid()::text || '/%' or length(p_path) > 200 or p_path like '%..%' then
      raise exception 'Invalid picture path';
    end if;
    if not exists (select 1 from storage.objects where bucket_id = 'avatars' and name = p_path) then
      raise exception 'Picture not found, please upload it again';
    end if;
  end if;
  update public.profiles set avatar_path = p_path where id = auth.uid();
end;
$$;

revoke all on function public.set_my_avatar(text) from public, anon;
grant execute on function public.set_my_avatar(text) to authenticated;
