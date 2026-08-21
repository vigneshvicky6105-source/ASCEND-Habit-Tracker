-- PROJECT ASCEND database schema
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Tasks Table
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Task Completions History
create table if not exists public.task_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  completed_on date not null,
  created_at timestamptz not null default now(),
  unique(user_id, task_id, completed_on)
);

-- 3. Books (Reading Command Center)
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  author text default '',
  start_date date,
  completed_date date,
  current_page integer not null default 0,
  total_pages integer not null default 0,
  status text not null default 'Reading',
  notes text default '',
  created_at timestamptz not null default now()
);

-- 4. Wishlist (Things to Buy)
create table if not exists public.wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item text not null,
  category text default 'General',
  estimated_cost numeric default 0,
  priority text default 'Medium',
  purchased boolean not null default false,
  notes text default '',
  created_at timestamptz not null default now()
);

-- 5. Core Concepts
create table if not exists public.core_concepts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subtitle text default 'Daily learning target',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- 6. Profile Settings
create table if not exists public.profile_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text default '',
  timezone text default 'Asia/Kolkata',
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS) on all tables
alter table public.tasks enable row level security;
alter table public.task_completions enable row level security;
alter table public.books enable row level security;
alter table public.wishlist enable row level security;
alter table public.core_concepts enable row level security;
alter table public.profile_settings enable row level security;

-- Row Level Security Policies (Users can only access their own data)
drop policy if exists "tasks own" on public.tasks;
create policy "tasks own" on public.tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "completions own" on public.task_completions;
create policy "completions own" on public.task_completions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "books own" on public.books;
create policy "books own" on public.books for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "wishlist own" on public.wishlist;
create policy "wishlist own" on public.wishlist for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "core_concepts own" on public.core_concepts;
create policy "core_concepts own" on public.core_concepts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "settings own" on public.profile_settings;
create policy "settings own" on public.profile_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Migration safety helpers for existing tables
alter table public.tasks add column if not exists locked boolean not null default false;
alter table public.tasks add column if not exists category text not null default 'Main Quest';
alter table public.tasks add column if not exists target text default '';
alter table public.tasks add column if not exists xp integer not null default 10;
alter table public.tasks add column if not exists active boolean not null default true;
alter table public.tasks add column if not exists sort_order integer not null default 0;

alter table public.books add column if not exists author text default '';
alter table public.books add column if not exists start_date date;
alter table public.books add column if not exists completed_date date;
alter table public.books add column if not exists status text not null default 'Reading';
alter table public.books add column if not exists notes text default '';

alter table public.wishlist add column if not exists category text default 'General';
alter table public.wishlist add column if not exists priority text default 'Medium';
alter table public.wishlist add column if not exists notes text default '';
