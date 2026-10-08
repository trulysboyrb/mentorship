-- Phase 4: watch progress and sequential lesson unlocking (enforced in the database).

alter table public.lesson_content add column duration_seconds real;

create table public.lesson_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  watched_seconds real not null default 0,
  last_position real not null default 0,
  completed boolean not null default false,
  completed_at timestamptz,
  last_report_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

alter table public.lesson_progress enable row level security;

-- Read-only from the browser. All writes go through report_progress() below.
create policy "read own progress" on public.lesson_progress
  for select to authenticated using (user_id = auth.uid());
create policy "admins read all progress" on public.lesson_progress
  for select to authenticated using (public.is_admin());

-- Which lessons can the current user open?
-- Lessons are in course order (module position, then lesson position).
-- The first lesson is always open. Each later lesson opens when the one before it
-- is completed, or has no video yet (so unfinished lessons never block the course).
-- Admins can open everything.
create function public.unlocked_lessons()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  with ordered as (
    select l.id, row_number() over (order by m.position, l.position) as rn
    from public.lessons l
    join public.modules m on m.id = l.module_id
  ),
  flags as (
    select o.id, o.rn,
      (
        exists (
          select 1 from public.lesson_progress lp
          where lp.lesson_id = o.id and lp.user_id = auth.uid() and lp.completed
        )
        or not exists (
          select 1 from public.lesson_content lc
          where lc.lesson_id = o.id
            and (lc.video_path is not null or lc.video_url is not null)
        )
      ) as satisfied
    from ordered o
  )
  select f.id
  from flags f
  where public.is_admin()
     or f.rn = 1
     or exists (select 1 from flags p where p.rn = f.rn - 1 and p.satisfied);
$$;

create function public.lesson_unlocked(target uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select target in (select public.unlocked_lessons());
$$;

-- Videos and notes now require: cleared AND the lesson is unlocked (or admin).
drop policy "cleared or admin read content" on public.lesson_content;
create policy "unlocked or admin read content" on public.lesson_content
  for select to authenticated
  using (
    public.is_admin()
    or (public.is_cleared() and public.lesson_unlocked(lesson_id))
  );

-- Same rule for the video files themselves (folder name = lesson id).
drop policy "cleared or admin read videos" on storage.objects;
create policy "unlocked or admin read videos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'course-videos'
    and (
      public.is_admin()
      or (
        public.is_cleared()
        and public.lesson_unlocked(((storage.foldername(name))[1])::uuid)
      )
    )
  );

-- The browser reports how much was actually played. The server decides what counts:
--  * a report can never claim more than ~2x the real time since the last report,
--    so completion cannot be faked instantly;
--  * the lesson completes after ~90% of its duration has really been watched.
create function public.report_progress(
  p_lesson uuid,
  p_position real,
  p_played real,
  p_duration real
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  dur real;
  rec public.lesson_progress%rowtype;
  gap real;
  credit real;
  new_watched real;
  is_done boolean;
begin
  if uid is null or not (public.is_cleared() or public.is_admin()) then
    raise exception 'Locked';
  end if;
  if not public.lesson_unlocked(p_lesson) then
    raise exception 'Lesson locked';
  end if;

  select duration_seconds into dur from public.lesson_content where lesson_id = p_lesson;
  dur := coalesce(dur, nullif(p_duration, 0));
  if dur is null or dur <= 0 then
    return jsonb_build_object('completed', false, 'watched', 0, 'duration', 0);
  end if;

  insert into public.lesson_progress (user_id, lesson_id, last_report_at)
  values (uid, p_lesson, now() - interval '20 seconds')
  on conflict (user_id, lesson_id) do nothing;

  select * into rec
  from public.lesson_progress
  where user_id = uid and lesson_id = p_lesson
  for update;

  if rec.completed then
    return jsonb_build_object('completed', true, 'watched', rec.watched_seconds, 'duration', dur);
  end if;

  gap := extract(epoch from (now() - rec.last_report_at));
  credit := least(greatest(coalesce(p_played, 0), 0), (gap + 1) * 2);
  new_watched := least(rec.watched_seconds + credit, dur * 1.5);
  is_done := new_watched >= dur * 0.9;

  update public.lesson_progress
  set watched_seconds = new_watched,
      last_position = least(greatest(coalesce(p_position, 0), 0), dur),
      last_report_at = now(),
      completed = is_done,
      completed_at = case when is_done then now() end
  where user_id = uid and lesson_id = p_lesson;

  return jsonb_build_object('completed', is_done, 'watched', new_watched, 'duration', dur);
end;
$$;

revoke all on function public.unlocked_lessons() from public, anon;
revoke all on function public.lesson_unlocked(uuid) from public, anon;
revoke all on function public.report_progress(uuid, real, real, real) from public, anon;
grant execute on function public.unlocked_lessons() to authenticated;
grant execute on function public.lesson_unlocked(uuid) to authenticated;
grant execute on function public.report_progress(uuid, real, real, real) to authenticated;
