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
  starter_key text default null,
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Core Concepts
create table if not exists public.core_concepts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subtitle text default 'Daily learning target',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. Profile Settings
create table if not exists public.profile_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text default '',
  timezone text default 'Asia/Kolkata',
  notification_prefs jsonb default '{}'::jsonb,
  daily_focus_goal text default '',
  template_version integer default 1,
  updated_at timestamptz not null default now()
);

-- 7. Side Quests (Temporary Date-Bound Tasks)
create table if not exists public.side_quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text default '',
  date date not null default CURRENT_DATE,
  priority text default 'Medium',
  due_time text default '',
  category text default 'General',
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

-- 8. Dues (Lent & Owed Expense Tracking)
create table if not exists public.dues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_name text not null,
  type text not null default 'lent',
  original_amount numeric not null default 0,
  amount_paid numeric not null default 0,
  date date not null default CURRENT_DATE,
  due_date date,
  reason text default '',
  status text default 'Pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 9. Fitness Logs (Weights, Nutrition, Workouts)
create table if not exists public.fitness_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_type text not null, -- 'weight', 'nutrition', 'workout'
  log_date date not null default CURRENT_DATE,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 10. Daily Focus
create table if not exists public.daily_focus (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  focus_date date not null default CURRENT_DATE,
  goal text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, focus_date)
);

-- Enable Row Level Security (RLS) on all tables
alter table public.tasks enable row level security;
alter table public.task_completions enable row level security;
alter table public.books enable row level security;
alter table public.wishlist enable row level security;
alter table public.core_concepts enable row level security;
alter table public.profile_settings enable row level security;
alter table public.side_quests enable row level security;
alter table public.dues enable row level security;
alter table public.fitness_logs enable row level security;
alter table public.daily_focus enable row level security;

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

drop policy if exists "side_quests own" on public.side_quests;
create policy "side_quests own" on public.side_quests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "dues own" on public.dues;
create policy "dues own" on public.dues for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "fitness_logs own" on public.fitness_logs;
create policy "fitness_logs own" on public.fitness_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "daily_focus own" on public.daily_focus;
create policy "daily_focus own" on public.daily_focus for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Schema columns migration helpers
alter table public.tasks add column if not exists starter_key text default null;
alter table public.tasks add column if not exists updated_at timestamptz not null default now();
alter table public.books add column if not exists updated_at timestamptz not null default now();
alter table public.wishlist add column if not exists updated_at timestamptz not null default now();
alter table public.core_concepts add column if not exists updated_at timestamptz not null default now();
alter table public.side_quests add column if not exists updated_at timestamptz not null default now();
alter table public.profile_settings add column if not exists notification_prefs jsonb default '{}'::jsonb;
alter table public.profile_settings add column if not exists daily_focus_goal text default '';
alter table public.profile_settings add column if not exists template_version integer default 1;

-- ==============================================================================
-- SAFE DEDUPLICATION SCRIPT FOR EXISTING STARTER TASK DUPLICATES
-- Reassigns task completion history to canonical starter task IDs before deletion
-- ==============================================================================
DO $$
DECLARE
    r RECORD;
    canonical_id uuid;
BEGIN
    FOR r IN (
        SELECT user_id, title, MIN(created_at) as first_created
        FROM public.tasks
        WHERE title IN (
            'LeetCode + GeeksforGeeks',
            'Check Mail',
            'IT Learning',
            'Apply for Jobs — Naukri + Indeed',
            'Read 10 Pages',
            'Post on LinkedIn',
            'Create + Post Brainrot Videos',
            'Core Concept Learning',
            'Python Brush-Up',
            'Drink 5L Water',
            'Record Yourself Explaining a Topic',
            'Run 5 KM',
            'Run 5 KM or 50K Steps',
            'Hit the Gym'
        )
        GROUP BY user_id, title
        HAVING COUNT(*) > 1
    ) LOOP
        -- 1. Identify canonical task ID
        SELECT id INTO canonical_id
        FROM public.tasks
        WHERE user_id = r.user_id AND title = r.title AND created_at = r.first_created
        LIMIT 1;

        IF canonical_id IS NOT NULL THEN
            -- 2. Reassign task_completions to canonical task ID
            UPDATE public.task_completions tc
            SET task_id = canonical_id
            FROM public.tasks t
            WHERE tc.task_id = t.id
              AND t.user_id = r.user_id
              AND t.title = r.title
              AND t.id <> canonical_id
              AND NOT EXISTS (
                  SELECT 1 FROM public.task_completions existing
                  WHERE existing.user_id = tc.user_id
                    AND existing.task_id = canonical_id
                    AND existing.completed_on = tc.completed_on
              );

            -- 3. Delete leftover duplicate task records
            DELETE FROM public.tasks
            WHERE user_id = r.user_id
              AND title = r.title
              AND id <> canonical_id;
        END IF;
    END LOOP;
END $$;
