-- Phase 7: course-finished stats, announcements, lesson Q&A, private student notes.

-- ---------- Certificates: serial number (used by auto-generated certificates) ----------
alter table public.certificates add column serial text unique;

-- ---------- Admin stats: who finished the whole course? ----------
-- "Finished" = completed every lesson that has a video. Returns nothing for non-admins.
create function public.admin_student_stats()
returns table (user_id uuid, completed_count int, required_done int, required_total int)
language sql
security definer
stable
set search_path = public
as $$
  with req as (
    select lc.lesson_id from public.lesson_content lc
    where lc.video_path is not null or lc.video_url is not null
  ),
  tot as (select count(*)::int as n from req)
  select
    p.id,
    (select count(*) from public.lesson_progress lp
       where lp.user_id = p.id and lp.completed)::int,
    (select count(*) from public.lesson_progress lp
       join req r on r.lesson_id = lp.lesson_id
       where lp.user_id = p.id and lp.completed)::int,
    (select n from tot)
  from public.profiles p
  where p.role = 'student' and public.is_admin();
$$;

revoke all on function public.admin_student_stats() from public, anon;
grant execute on function public.admin_student_stats() to authenticated;

-- ---------- Announcements ----------
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 120),
  body text not null check (length(trim(body)) between 1 and 2000),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.announcements enable row level security;

create policy "cleared or admin read announcements" on public.announcements
  for select to authenticated
  using (public.is_admin() or public.is_cleared());

create policy "admin manage announcements" on public.announcements
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- Lesson comments (questions and replies) ----------
create table public.lesson_comments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  parent_id uuid references public.lesson_comments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  author_name text not null,
  is_staff boolean not null default false,
  body text not null check (length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index lesson_comments_lesson_idx on public.lesson_comments (lesson_id, created_at);

alter table public.lesson_comments enable row level security;

-- Only cleared students who have unlocked the lesson (and admins) can read.
create policy "read comments" on public.lesson_comments
  for select to authenticated
  using (
    public.is_admin()
    or (public.is_cleared() and public.lesson_unlocked(lesson_id))
  );

-- Delete your own comment, or any comment if you are an admin.
-- There is NO insert policy: posting goes through post_comment() below.
create policy "delete own or admin comments" on public.lesson_comments
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

create function public.post_comment(p_lesson uuid, p_body text, p_parent uuid default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_staff boolean := public.is_admin();
  v_clean text := trim(coalesce(p_body, ''));
  v_full text;
  v_parts text[];
  v_name text;
  v_parent_lesson uuid;
  v_parent_parent uuid;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Not logged in';
  end if;
  if not (v_staff or (public.is_cleared() and public.lesson_unlocked(p_lesson))) then
    raise exception 'Locked';
  end if;
  if length(v_clean) < 1 then
    raise exception 'Write something first';
  end if;
  if length(v_clean) > 1000 then
    raise exception 'Comments can be at most 1000 characters';
  end if;

  -- Simple flood protection: 5 posts per minute per person.
  if (select count(*) from public.lesson_comments
      where user_id = v_uid and created_at > now() - interval '1 minute') >= 5 then
    raise exception 'Slow down: please wait a minute before posting again';
  end if;

  -- Replies attach to the top-level comment (one level of threading).
  if p_parent is not null then
    select lesson_id, parent_id into v_parent_lesson, v_parent_parent
    from public.lesson_comments where id = p_parent;
    if v_parent_lesson is null or v_parent_lesson <> p_lesson then
      raise exception 'Invalid reply';
    end if;
    if v_parent_parent is not null then
      p_parent := v_parent_parent;
    end if;
  end if;

  -- Students are shown as first name + last initial, e.g. "Fatou S."
  select full_name into v_full from public.profiles where id = v_uid;
  v_parts := regexp_split_to_array(trim(coalesce(v_full, '')), '\s+');
  v_name := coalesce(nullif(v_parts[1], ''), 'Student');
  if not v_staff and array_length(v_parts, 1) > 1 then
    v_name := v_name || ' ' || upper(left(v_parts[array_length(v_parts, 1)], 1)) || '.';
  end if;

  insert into public.lesson_comments (lesson_id, parent_id, user_id, author_name, is_staff, body)
  values (p_lesson, p_parent, v_uid, v_name, v_staff, v_clean)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.post_comment(uuid, text, uuid) from public, anon;
grant execute on function public.post_comment(uuid, text, uuid) to authenticated;

-- ---------- Private student notes (admins only, never visible to students) ----------
create table public.student_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  author_name text not null default '',
  body text not null check (length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index student_notes_student_idx on public.student_notes (student_id, created_at desc);

alter table public.student_notes enable row level security;

create policy "admins read notes" on public.student_notes
  for select to authenticated using (public.is_admin());

create policy "admins delete notes" on public.student_notes
  for delete to authenticated using (public.is_admin());

create function public.add_student_note(p_student uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not allowed';
  end if;
  insert into public.student_notes (student_id, author_id, author_name, body)
  values (
    p_student,
    auth.uid(),
    coalesce((select full_name from public.profiles where id = auth.uid()), ''),
    trim(p_body)
  );
end;
$$;

revoke all on function public.add_student_note(uuid, text) from public, anon;
grant execute on function public.add_student_note(uuid, text) to authenticated;

-- ---------- Live updates ----------
alter publication supabase_realtime add table public.announcements;
alter publication supabase_realtime add table public.lesson_comments;
alter publication supabase_realtime add table public.lesson_progress;
