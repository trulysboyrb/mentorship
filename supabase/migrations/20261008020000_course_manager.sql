-- Phase 3: private video storage, video path column, reorder helpers.

alter table public.lesson_content add column video_path text;

-- Private bucket for course videos (50 MB cap = Supabase free plan limit).
insert into storage.buckets (id, name, public, file_size_limit)
values ('course-videos', 'course-videos', false, 52428800)
on conflict (id) do nothing;

-- Videos are readable ONLY by cleared students and admins.
create policy "cleared or admin read videos" on storage.objects
  for select to authenticated
  using (bucket_id = 'course-videos' and (public.is_admin() or public.is_cleared()));

-- Only admins can upload, replace or delete videos.
create policy "admin upload videos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'course-videos' and public.is_admin());

create policy "admin update videos" on storage.objects
  for update to authenticated
  using (bucket_id = 'course-videos' and public.is_admin());

create policy "admin delete videos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'course-videos' and public.is_admin());

-- Move a module up (-1) or down (+1) by swapping positions.
create function public.move_module(target uuid, direction int)
returns void
language plpgsql
set search_path = public
as $$
declare
  cur int;
  other_id uuid;
  other_pos int;
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  select position into cur from public.modules where id = target;
  if direction < 0 then
    select id, position into other_id, other_pos from public.modules
      where position < cur order by position desc limit 1;
  else
    select id, position into other_id, other_pos from public.modules
      where position > cur order by position asc limit 1;
  end if;
  if other_id is null then return; end if;

  update public.modules set position = -1 where id = target;
  update public.modules set position = cur where id = other_id;
  update public.modules set position = other_pos where id = target;
end;
$$;

create function public.move_lesson(target uuid, direction int)
returns void
language plpgsql
set search_path = public
as $$
declare
  cur int;
  mod_id uuid;
  other_id uuid;
  other_pos int;
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  select position, module_id into cur, mod_id from public.lessons where id = target;
  if direction < 0 then
    select id, position into other_id, other_pos from public.lessons
      where module_id = mod_id and position < cur order by position desc limit 1;
  else
    select id, position into other_id, other_pos from public.lessons
      where module_id = mod_id and position > cur order by position asc limit 1;
  end if;
  if other_id is null then return; end if;

  update public.lessons set position = -1 where id = target;
  update public.lessons set position = cur where id = other_id;
  update public.lessons set position = other_pos where id = target;
end;
$$;

revoke all on function public.move_module(uuid, int) from public, anon;
revoke all on function public.move_lesson(uuid, int) from public, anon;
grant execute on function public.move_module(uuid, int) to authenticated;
grant execute on function public.move_lesson(uuid, int) to authenticated;
