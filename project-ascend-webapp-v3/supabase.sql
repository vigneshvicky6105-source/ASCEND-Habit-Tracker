-- PROJECT ASCEND database
-- Run this in Supabase SQL Editor.

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null default 'Main Quest',
  target text default '',
  xp integer not null default 10,
  locked boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.task_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  completed_on date not null,
  created_at timestamptz not null default now(),
  unique(user_id, task_id, completed_on)
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  author text default '',
  start_date date,
  completed_date date,
  current_page integer not null default 0,
  total_pages integer not null default 0,
  status text not null default 'Not Started',
  notes text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item text not null,
  category text default '',
  estimated_cost numeric default 0,
  priority text default 'Medium',
  purchased boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.profile_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text default '',
  timezone text default 'Asia/Kolkata',
  updated_at timestamptz not null default now()
);

alter table public.tasks enable row level security;
alter table public.task_completions enable row level security;
alter table public.books enable row level security;
alter table public.wishlist enable row level security;
alter table public.profile_settings enable row level security;

create policy "tasks own" on public.tasks for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "completions own" on public.task_completions for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "books own" on public.books for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "wishlist own" on public.wishlist for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "settings own" on public.profile_settings for all using (auth.uid()=user_id) with check (auth.uid()=user_id);

-- Optional starter quests are created automatically by the app for each new user.
