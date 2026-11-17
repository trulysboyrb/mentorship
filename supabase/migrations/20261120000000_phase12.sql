-- Phase 12: YouTube (unlisted) videos for lessons. Run ONCE in the Supabase SQL Editor
-- (after the Phase 11 SQL).

-- Only real YouTube links may be saved as a lesson video link. (NOT VALID = old rows are left alone.)
alter table public.lesson_content
  add constraint lesson_video_url_youtube
  check (video_url is null or video_url ~ '^https://www\.youtube\.com/watch\?v=[A-Za-z0-9_-]{11}$')
  not valid;

-- Same as before, with one change: a YouTube lesson only counts watch time when its length
-- has been saved by the admin. (Otherwise a student could report a fake tiny length.)
create or replace function public.report_progress(
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
  has_link boolean;
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

  select duration_seconds, video_url is not null and video_path is null
    into dur, has_link
  from public.lesson_content where lesson_id = p_lesson;

  if dur is null and coalesce(has_link, false) then
    -- YouTube lesson without a saved length: do not trust the browser's number.
    return jsonb_build_object('completed', false, 'watched', 0, 'duration', 0);
  end if;

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

revoke all on function public.report_progress(uuid, real, real, real) from public, anon;
grant execute on function public.report_progress(uuid, real, real, real) to authenticated;
