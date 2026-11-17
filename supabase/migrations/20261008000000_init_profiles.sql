-- ApexTrade Academy: Phase 1 database
-- Profiles (one per user), admin check, payment clearance, realtime.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text not null default '',
  whatsapp text,
  country text,
  learning_mode text check (learning_mode in ('online', 'in_person')),
  experience text check (experience in ('beginner', 'intermediate', 'experienced')),
  heard_from text,
  role text not null default 'student' check (role in ('student', 'admin')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'cleared')),
  cleared_at timestamptz,
  cleared_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Is the current user an admin? SECURITY DEFINER lets it read profiles
-- without triggering the RLS policies below (avoids infinite recursion).
create function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Students can read only their own row. Admins can read all rows.
-- There are NO insert/update/delete policies on purpose: nobody can
-- change their own role or payment status from the browser.
create policy "read own profile"
  on public.profiles for select to authenticated
  using (id = auth.uid());

create policy "admins read all profiles"
  on public.profiles for select to authenticated
  using (public.is_admin());

-- Auto-create a profile whenever someone signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles
    (id, email, full_name, whatsapp, country, learning_mode, experience, heard_from)
  values (
    new.id,
    new.email,
    coalesce(meta->>'full_name', ''),
    nullif(meta->>'whatsapp', ''),
    nullif(meta->>'country', ''),
    case when meta->>'learning_mode' in ('online', 'in_person') then meta->>'learning_mode' end,
    case when meta->>'experience' in ('beginner', 'intermediate', 'experienced') then meta->>'experience' end,
    nullif(meta->>'heard_from', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Clear / unclear a student. Only admins can run this.
create function public.set_payment_status(target uuid, new_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not allowed';
  end if;
  if new_status not in ('pending', 'cleared') then
    raise exception 'Invalid status';
  end if;

  update public.profiles
  set payment_status = new_status,
      cleared_at = case when new_status = 'cleared' then now() else null end,
      cleared_by = case when new_status = 'cleared' then auth.uid() else null end
  where id = target;
end;
$$;

revoke all on function public.set_payment_status(uuid, text) from public, anon;
grant execute on function public.set_payment_status(uuid, text) to authenticated;

-- Live updates: the student's screen reacts the moment they are cleared.
alter publication supabase_realtime add table public.profiles;
