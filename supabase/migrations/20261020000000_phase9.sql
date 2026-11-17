-- Phase 9: live classes, quizzes, notes & downloads, referral rewards + payouts.
-- Run this ONCE in the Supabase SQL Editor (after the Phase 8 SQL).

-- =====================================================================
-- 1. Live classes + reminders
-- =====================================================================
create table public.live_classes (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 120),
  description text check (length(description) <= 1000),
  starts_at timestamptz not null,
  duration_minutes int not null default 60 check (duration_minutes between 15 and 480),
  kind text not null default 'online' check (kind in ('online', 'in_person')),
  join_url text check (length(join_url) <= 500),
  location text check (length(location) <= 200),
  created_at timestamptz not null default now()
);
create index live_classes_starts_idx on public.live_classes (starts_at);

create table public.class_reminders (
  user_id uuid not null references public.profiles (id) on delete cascade,
  class_id uuid not null references public.live_classes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, class_id)
);

alter table public.live_classes enable row level security;
alter table public.class_reminders enable row level security;

create policy "cleared or admin read classes" on public.live_classes
  for select to authenticated using (public.is_admin() or public.is_cleared());
create policy "admin manage classes" on public.live_classes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "read own reminders" on public.class_reminders
  for select to authenticated using (user_id = auth.uid());
create policy "add own reminders" on public.class_reminders
  for insert to authenticated
  with check (user_id = auth.uid() and (public.is_admin() or public.is_cleared()));
create policy "remove own reminders" on public.class_reminders
  for delete to authenticated using (user_id = auth.uid());

alter publication supabase_realtime add table public.live_classes;

-- =====================================================================
-- 2. Quizzes (answers never leave the database until you submit)
-- =====================================================================
create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null unique references public.modules (id) on delete cascade,
  pass_mark int not null default 70 check (pass_mark between 1 and 100),
  created_at timestamptz not null default now()
);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  position int not null default 0,
  prompt text not null check (length(trim(prompt)) between 1 and 500),
  options text[] not null check (array_length(options, 1) between 2 and 5),
  correct_index int not null check (correct_index >= 0),
  created_at timestamptz not null default now(),
  check (correct_index < array_length(options, 1))
);
create index quiz_questions_quiz_idx on public.quiz_questions (quiz_id, position);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  score int not null,
  passed boolean not null,
  created_at timestamptz not null default now()
);
create index quiz_attempts_user_idx on public.quiz_attempts (user_id, quiz_id);

alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;

create policy "cleared or admin read quizzes" on public.quizzes
  for select to authenticated using (public.is_admin() or public.is_cleared());
create policy "admin manage quizzes" on public.quizzes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Questions hold the correct answers: admins only. Students use get_quiz().
create policy "admin manage questions" on public.quiz_questions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "read own attempts" on public.quiz_attempts
  for select to authenticated using (user_id = auth.uid());
create policy "admins read attempts" on public.quiz_attempts
  for select to authenticated using (public.is_admin());
-- No insert policy: attempts are written by submit_quiz().

-- Module has a quiz with at least one question, and the student has passed it
-- (or there is nothing to pass).
create function public.quiz_cleared(p_module uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    not exists (
      select 1 from public.quizzes q
      where q.module_id = p_module
        and exists (select 1 from public.quiz_questions qq where qq.quiz_id = q.id)
    )
    or exists (
      select 1 from public.quiz_attempts a
      join public.quizzes q on q.id = a.quiz_id
      where q.module_id = p_module and a.user_id = auth.uid() and a.passed
    );
$$;

-- Every quiz in modules BEFORE this one has been passed (or does not exist).
create function public.earlier_quizzes_ok(p_module uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select not exists (
    select 1 from public.modules m
    where m.position < (select position from public.modules where id = p_module)
      and not public.quiz_cleared(m.id)
  );
$$;
revoke all on function public.earlier_quizzes_ok(uuid) from public, anon;
grant execute on function public.earlier_quizzes_ok(uuid) to authenticated;

-- Lesson unlocking, version 2. Same rules as before, plus:
--  * every lesson of a module needs the quizzes of all earlier modules passed.
create or replace function public.unlocked_lessons()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  with ordered as (
    select l.id, l.module_id,
      row_number() over (order by m.position, l.position) as rn
    from public.lessons l
    join public.modules m on m.id = l.module_id
  ),
  flags as (
    select o.*,
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
     or (
       public.earlier_quizzes_ok(f.module_id)
       and (
         f.rn = 1
         or exists (select 1 from flags p where p.rn = f.rn - 1 and p.satisfied)
       )
     );
$$;

-- Is the quiz for this module open to me? Admin: always. Student: some lesson of the
-- module is unlocked and every lesson in it is done.
create function public.module_ready(p_module uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_admin()
    or (
      public.is_cleared()
      and exists (
        select 1 from public.lessons l
        where l.module_id = p_module and l.id in (select public.unlocked_lessons())
      )
      and not exists (
        select 1 from public.lessons l
        where l.module_id = p_module
          and exists (
            select 1 from public.lesson_content lc
            where lc.lesson_id = l.id and (lc.video_path is not null or lc.video_url is not null)
          )
          and not exists (
            select 1 from public.lesson_progress lp
            where lp.lesson_id = l.id and lp.user_id = auth.uid() and lp.completed
          )
      )
    );
$$;

-- One row per module that has questions: used by the sidebar and dashboard.
create function public.quiz_status()
returns table (module_id uuid, question_count int, pass_mark int, passed boolean, best_score int, ready boolean)
language sql
security definer
stable
set search_path = public
as $$
  select q.module_id,
    (select count(*)::int from public.quiz_questions qq where qq.quiz_id = q.id),
    q.pass_mark,
    exists (select 1 from public.quiz_attempts a where a.quiz_id = q.id and a.user_id = auth.uid() and a.passed),
    (select max(a.score) from public.quiz_attempts a where a.quiz_id = q.id and a.user_id = auth.uid()),
    public.module_ready(q.module_id)
  from public.quizzes q
  where (public.is_admin() or public.is_cleared())
    and exists (select 1 from public.quiz_questions qq where qq.quiz_id = q.id);
$$;

-- The questions WITHOUT the answers.
create function public.get_quiz(p_module uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  q public.quizzes%rowtype;
begin
  if not public.module_ready(p_module) then
    return null;
  end if;
  select * into q from public.quizzes where module_id = p_module;
  if not found then return null; end if;

  return jsonb_build_object(
    'quiz_id', q.id,
    'pass_mark', q.pass_mark,
    'passed', exists (select 1 from public.quiz_attempts a where a.quiz_id = q.id and a.user_id = auth.uid() and a.passed),
    'best_score', (select max(a.score) from public.quiz_attempts a where a.quiz_id = q.id and a.user_id = auth.uid()),
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object('id', qq.id, 'prompt', qq.prompt, 'options', to_jsonb(qq.options))
                       order by qq.position, qq.created_at)
      from public.quiz_questions qq where qq.quiz_id = q.id
    ), '[]'::jsonb)
  );
end;
$$;

-- Marks the quiz on the server. p_answers looks like {"<question id>": 2, ...}.
create function public.submit_quiz(p_module uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  q public.quizzes%rowtype;
  total int;
  correct int := 0;
  wrong jsonb := '[]'::jsonb;
  r record;
  given int;
  sc int;
  ok boolean;
  uid uuid := auth.uid();
begin
  if uid is null or not public.module_ready(p_module) then
    raise exception 'This quiz is not open yet';
  end if;
  select * into q from public.quizzes where module_id = p_module;
  if not found then raise exception 'No quiz for this module'; end if;

  if not public.is_admin() and exists (
    select 1 from public.quiz_attempts
    where user_id = uid and quiz_id = q.id and created_at > now() - interval '10 seconds'
  ) then
    raise exception 'Please wait a few seconds before trying again';
  end if;

  for r in
    select id, correct_index from public.quiz_questions
    where quiz_id = q.id order by position, created_at
  loop
    given := case
      when jsonb_typeof(coalesce(p_answers, '{}'::jsonb) -> (r.id::text)) = 'number'
      then (p_answers ->> (r.id::text))::int
    end;
    if given is not null and given = r.correct_index then
      correct := correct + 1;
    else
      wrong := wrong || to_jsonb(r.id);
    end if;
  end loop;

  total := correct + jsonb_array_length(wrong);
  if total = 0 then raise exception 'This quiz has no questions yet'; end if;
  sc := round(100.0 * correct / total);
  ok := sc >= q.pass_mark;

  -- Admin test runs are not recorded.
  if not public.is_admin() then
    insert into public.quiz_attempts (user_id, quiz_id, score, passed)
    values (uid, q.id, sc, ok);
  end if;

  return jsonb_build_object(
    'score', sc, 'passed', ok, 'pass_mark', q.pass_mark,
    'correct', correct, 'total', total, 'wrong', wrong
  );
end;
$$;

revoke all on function public.quiz_cleared(uuid) from public, anon;
revoke all on function public.module_ready(uuid) from public, anon;
revoke all on function public.quiz_status() from public, anon;
revoke all on function public.get_quiz(uuid) from public, anon;
revoke all on function public.submit_quiz(uuid, jsonb) from public, anon;
grant execute on function public.quiz_cleared(uuid) to authenticated;
grant execute on function public.module_ready(uuid) to authenticated;
grant execute on function public.quiz_status() to authenticated;
grant execute on function public.get_quiz(uuid) to authenticated;
grant execute on function public.submit_quiz(uuid, jsonb) to authenticated;

-- =====================================================================
-- 3. Notes and downloads (admin uploads, students download)
-- =====================================================================
create table public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 120),
  body text check (length(body) <= 5000),
  lesson_id uuid references public.lessons (id) on delete cascade, -- null = general note
  file_path text,
  file_name text,
  file_size bigint,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (file_path is not null or length(trim(coalesce(body, ''))) > 0)
);
create index resources_lesson_idx on public.resources (lesson_id);

alter table public.resources enable row level security;

create policy "students read unlocked resources" on public.resources
  for select to authenticated
  using (
    public.is_admin()
    or (public.is_cleared() and (lesson_id is null or public.lesson_unlocked(lesson_id)))
  );
create policy "admin manage resources" on public.resources
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resources', 'resources', false, 26214400,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'image/png', 'image/jpeg'
  ]
)
on conflict (id) do nothing;

create function public.can_read_resource_file(p_name text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.resources r
    where r.file_path = p_name
      and (
        public.is_admin()
        or (public.is_cleared() and (r.lesson_id is null or public.lesson_unlocked(r.lesson_id)))
      )
  );
$$;
revoke all on function public.can_read_resource_file(text) from public, anon;
grant execute on function public.can_read_resource_file(text) to authenticated;

create policy "read resource files" on storage.objects
  for select to authenticated
  using (bucket_id = 'resources' and (public.is_admin() or public.can_read_resource_file(name)));
create policy "admin upload resource files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'resources' and public.is_admin());
create policy "admin update resource files" on storage.objects
  for update to authenticated
  using (bucket_id = 'resources' and public.is_admin());
create policy "admin delete resource files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'resources' and public.is_admin());

alter publication supabase_realtime add table public.resources;

-- =====================================================================
-- 4. Referral rewards + payout requests
-- =====================================================================
insert into public.app_settings (key, value) values
  ('referral_reward', '500'),
  ('min_payout', '500');

create function public.referral_reward()
returns int language sql security definer stable set search_path = public as $$
  select coalesce((select value::int from public.app_settings where key = 'referral_reward'), 500);
$$;
create function public.min_payout()
returns int language sql security definer stable set search_path = public as $$
  select coalesce((select value::int from public.app_settings where key = 'min_payout'), 500);
$$;

create function public.set_payout_settings(p_reward int, p_min int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  if p_reward is null or p_reward < 0 or p_reward > 100000 then
    raise exception 'Reward must be between 0 and 100000';
  end if;
  if p_min is null or p_min < 1 or p_min > 1000000 then
    raise exception 'Minimum payout must be at least 1';
  end if;
  insert into public.app_settings (key, value) values ('referral_reward', p_reward::text)
    on conflict (key) do update set value = excluded.value;
  insert into public.app_settings (key, value) values ('min_payout', p_min::text)
    on conflict (key) do update set value = excluded.value;
end;
$$;

revoke all on function public.referral_reward() from public, anon;
revoke all on function public.min_payout() from public, anon;
revoke all on function public.set_payout_settings(int, int) from public, anon;
grant execute on function public.referral_reward() to authenticated;
grant execute on function public.min_payout() to authenticated;
grant execute on function public.set_payout_settings(int, int) to authenticated;

-- One reward per referred student, earned when THEY are cleared (paid).
-- The amount is locked in at that moment, so changing the setting later never
-- changes what people have already earned.
create table public.referral_rewards (
  referred_id uuid primary key references public.profiles (id) on delete cascade,
  referrer_id uuid not null references public.profiles (id) on delete cascade,
  amount int not null check (amount >= 0),
  created_at timestamptz not null default now()
);
create index referral_rewards_referrer_idx on public.referral_rewards (referrer_id);

create table public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount int not null check (amount > 0),
  payout_info text not null check (length(trim(payout_info)) between 3 and 200),
  status text not null default 'requested' check (status in ('requested', 'paid', 'rejected')),
  admin_note text check (length(admin_note) <= 500),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null
);
create index payout_requests_user_idx on public.payout_requests (user_id, created_at desc);

alter table public.referral_rewards enable row level security;
alter table public.payout_requests enable row level security;

create policy "read own rewards" on public.referral_rewards
  for select to authenticated using (referrer_id = auth.uid());
create policy "admins read rewards" on public.referral_rewards
  for select to authenticated using (public.is_admin());
create policy "read own payouts" on public.payout_requests
  for select to authenticated using (user_id = auth.uid());
create policy "admins read payouts" on public.payout_requests
  for select to authenticated using (public.is_admin());
-- No write policies: requests go through request_payout(), admins through admin_resolve_payout().

alter publication supabase_realtime add table public.payout_requests;

create function public.grant_referral_reward()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.referred_by is null then return new; end if;
  if new.payment_status = 'cleared' and old.payment_status <> 'cleared' then
    insert into public.referral_rewards (referred_id, referrer_id, amount)
    values (new.id, new.referred_by, public.referral_reward())
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger profiles_referral_reward
  after update of payment_status on public.profiles
  for each row execute function public.grant_referral_reward();

-- Students who are already cleared and joined with a code have earned it too.
insert into public.referral_rewards (referred_id, referrer_id, amount)
select p.id, p.referred_by, public.referral_reward()
from public.profiles p
where p.referred_by is not null
  and p.payment_status = 'cleared'
on conflict do nothing;

create function public.my_earnings()
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  with e as (select coalesce(sum(amount), 0)::int as v, count(*)::int as n
             from public.referral_rewards where referrer_id = auth.uid()),
  pd as (select coalesce(sum(amount) filter (where status = 'paid'), 0)::int as paid,
                coalesce(sum(amount) filter (where status = 'requested'), 0)::int as pending
         from public.payout_requests where user_id = auth.uid())
  select jsonb_build_object(
    'reward', public.referral_reward(),
    'min_payout', public.min_payout(),
    'rewarded_friends', (select n from e),
    'earned', (select v from e),
    'paid', (select paid from pd),
    'pending', (select pending from pd),
    'available', (select v from e) - (select paid from pd) - (select pending from pd),
    'has_open_request', exists (
      select 1 from public.payout_requests where user_id = auth.uid() and status = 'requested'
    )
  );
$$;

create function public.request_payout(p_info text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  avail int;
  new_id uuid;
begin
  if uid is null or not (public.is_cleared() or public.is_admin()) then
    raise exception 'Not allowed';
  end if;
  if length(trim(coalesce(p_info, ''))) < 3 then
    raise exception 'Tell us where to send the money (for example your Wave number)';
  end if;

  perform pg_advisory_xact_lock(hashtext(uid::text));

  if exists (select 1 from public.payout_requests where user_id = uid and status = 'requested') then
    raise exception 'You already have a payout request waiting';
  end if;

  avail := (public.my_earnings() ->> 'available')::int;
  if avail < public.min_payout() or avail <= 0 then
    raise exception 'You need at least D% available to request a payout', public.min_payout();
  end if;

  insert into public.payout_requests (user_id, amount, payout_info)
  values (uid, avail, trim(p_info))
  returning id into new_id;
  return new_id;
end;
$$;

create function public.admin_open_payouts()
returns int
language sql
security definer
stable
set search_path = public
as $$
  select case when public.is_admin()
    then (select count(*)::int from public.payout_requests where status = 'requested')
    else 0 end;
$$;

create function public.admin_list_payouts()
returns table (
  id uuid, user_id uuid, full_name text, whatsapp text, amount int, payout_info text,
  status text, admin_note text, created_at timestamptz, resolved_at timestamptz,
  rewarded_friends int
)
language sql
security definer
stable
set search_path = public
as $$
  select r.id, r.user_id, p.full_name, p.whatsapp, r.amount, r.payout_info,
         r.status, r.admin_note, r.created_at, r.resolved_at,
         (select count(*)::int from public.referral_rewards w where w.referrer_id = r.user_id)
  from public.payout_requests r
  join public.profiles p on p.id = r.user_id
  where public.is_admin()
  order by (r.status = 'requested') desc, r.created_at desc;
$$;

create function public.admin_resolve_payout(p_id uuid, p_status text, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  if p_status not in ('paid', 'rejected') then raise exception 'Invalid status'; end if;
  update public.payout_requests
  set status = p_status,
      admin_note = nullif(trim(coalesce(p_note, '')), ''),
      resolved_at = now(),
      resolved_by = auth.uid()
  where id = p_id and status = 'requested';
  if not found then raise exception 'This request was already handled'; end if;
end;
$$;

revoke all on function public.my_earnings() from public, anon;
revoke all on function public.request_payout(text) from public, anon;
revoke all on function public.admin_open_payouts() from public, anon;
revoke all on function public.admin_list_payouts() from public, anon;
revoke all on function public.admin_resolve_payout(uuid, text, text) from public, anon;
grant execute on function public.my_earnings() to authenticated;
grant execute on function public.request_payout(text) to authenticated;
grant execute on function public.admin_open_payouts() to authenticated;
grant execute on function public.admin_list_payouts() to authenticated;
grant execute on function public.admin_resolve_payout(uuid, text, text) to authenticated;

