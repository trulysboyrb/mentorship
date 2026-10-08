-- Phase 2: modules, lessons, locked lesson content, and the paywall.

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  position int not null unique,
  title text not null,
  created_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  position int not null,
  title text not null,
  created_at timestamptz not null default now(),
  unique (module_id, position)
);

-- The valuable part (video + notes) lives in its own table so it can be locked.
create table public.lesson_content (
  lesson_id uuid primary key references public.lessons (id) on delete cascade,
  video_url text,
  notes text
);

alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_content enable row level security;

create function public.is_cleared()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and payment_status = 'cleared'
  );
$$;

-- Any logged-in user can see titles (the app blurs them until cleared).
create policy "read modules" on public.modules
  for select to authenticated using (true);
create policy "read lessons" on public.lessons
  for select to authenticated using (true);

-- THE PAYWALL: video links and notes only come back for cleared students and admins.
create policy "cleared or admin read content" on public.lesson_content
  for select to authenticated
  using (public.is_cleared() or public.is_admin());

-- Only admins can add/edit/delete course material.
create policy "admin write modules" on public.modules
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin write lessons" on public.lessons
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin write content" on public.lesson_content
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Starter content ----------
with m as (
  insert into public.modules (position, title) values
    (1, 'First Step'),
    (2, 'The Foundation'),
    (3, 'The Toolbox'),
    (4, 'The Math')
  returning id, position
)
insert into public.lessons (module_id, position, title)
select m.id, v.pos, v.title
from (values
  (1, 1, 'Download Platform'),
  (1, 2, 'Open Broker Account'),
  (1, 3, 'Open a Demo Account'),
  (2, 1, 'What is Forex?'),
  (2, 2, 'How the Market Moves'),
  (2, 3, 'The Players'),
  (2, 4, 'The Terminologies'),
  (3, 1, 'Candlestick Anatomy'),
  (3, 2, 'Market Structure'),
  (3, 3, 'Support & Resistance'),
  (3, 4, 'Technical Indicators'),
  (3, 5, 'Economic Calendar'),
  (4, 1, 'Pips and Lot Sizes'),
  (4, 2, 'Risk and Position Sizing')
) as v(mpos, pos, title)
join m on m.position = v.mpos;

insert into public.lesson_content (lesson_id, notes)
select id, 'Notes for this lesson will appear here.' from public.lessons;
