create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  plan text not null default 'free'
    check (plan in ('free', 'basic', 'premium', 'lifetime')),
  created_at timestamptz default now()
);

create table public.course_progress (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  language text not null,
  completed integer not null default 0,
  xp integer not null default 0,
  updated_at timestamptz default now(),
  unique(user_id, language)
);

create table public.payments (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null,
  status text not null default 'pending',
  payment_id text unique,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.course_progress enable row level security;
alter table public.payments enable row level security;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.course_progress to authenticated;

create policy "read own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "insert own profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "update own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "read own progress"
on public.course_progress
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "insert own progress"
on public.course_progress
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "update own progress"
on public.course_progress
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "delete own progress"
on public.course_progress
for delete
to authenticated
using ((select auth.uid()) = user_id);
