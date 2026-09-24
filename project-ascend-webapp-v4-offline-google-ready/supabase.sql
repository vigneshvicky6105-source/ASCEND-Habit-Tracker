-- ==============================================================================
-- PROJECT ASCEND — COMPLETE SUPABASE DATABASE SCHEMA
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ==============================================================================

-- 1. Tables Definition
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
  updated_at timestamptz not null default now(),
  deleted_at timestamptz default null
);

create table if not exists public.task_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  completed_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz default null
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
  status text not null default 'Reading',
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz default null
);

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
  updated_at timestamptz not null default now(),
  deleted_at timestamptz default null
);

create table if not exists public.core_concepts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subtitle text default 'Daily learning target',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz default null
);

create table if not exists public.profile_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text default '',
  timezone text default 'Asia/Kolkata',
  notification_prefs jsonb default '{}'::jsonb,
  daily_focus_goal text default '',
  template_version integer default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  updated_at timestamptz not null default now(),
  deleted_at timestamptz default null
);

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
  updated_at timestamptz not null default now(),
  deleted_at timestamptz default null
);

create table if not exists public.fitness_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_type text not null, -- 'weight', 'nutrition', 'workout'
  log_date date not null default CURRENT_DATE,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz default null
);

create table if not exists public.fitness_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Solomon 6-Day Split',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fitness_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid references public.fitness_programs(id) on delete cascade,
  day_of_week integer not null,
  name text not null,
  muscle_groups text default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fitness_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_id uuid references public.fitness_days(id) on delete cascade,
  name text not null,
  muscle_group text not null,
  target_reps text not null default '10',
  target_sets integer not null default 3,
  default_weight numeric default 0,
  sort_order integer not null default 0,
  optional boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_id uuid references public.fitness_days(id) on delete set null,
  split_title text not null,
  day_name text not null,
  workout_date date not null default CURRENT_DATE,
  status text not null default 'COMPLETED',
  started_at timestamptz default now(),
  completed_at timestamptz default now(),
  duration_minutes integer default 45,
  total_volume numeric default 0,
  total_sets integer default 0,
  total_reps integer default 0,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.workout_sessions(id) on delete cascade,
  exercise_id text not null,
  set_number integer not null default 1,
  weight numeric not null default 0,
  actual_reps integer not null default 0,
  target_reps text default '',
  completed boolean not null default true,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_focus (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  focus_date date not null default CURRENT_DATE,
  goal text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz default null
);

create table if not exists public.whatsapp_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lending_id text,
  installment_id text,
  reminder_type text default 'due_date',
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  provider_message_id text default '',
  status text default 'Pending',
  failure_reason text default '',
  idempotency_key text unique,
  created_at timestamptz not null default now()
);

-- 2. Uniqueness Constraints
alter table public.task_completions drop constraint if exists task_completions_user_id_task_id_completed_on_key;
alter table public.task_completions add constraint task_completions_user_id_task_id_completed_on_key unique (user_id, task_id, completed_on);

alter table public.daily_focus drop constraint if exists daily_focus_user_id_focus_date_key;
alter table public.daily_focus add constraint daily_focus_user_id_focus_date_key unique (user_id, focus_date);

drop index if exists idx_tasks_user_starter_key;
create unique index idx_tasks_user_starter_key on public.tasks (user_id, starter_key) where starter_key is not null;

-- 3. High Performance Indexes
create index if not exists idx_tasks_user_id on public.tasks(user_id);
create index if not exists idx_tasks_user_updated on public.tasks(user_id, updated_at);

create index if not exists idx_completions_user_id on public.task_completions(user_id);
create index if not exists idx_completions_user_date on public.task_completions(user_id, completed_on);
create index if not exists idx_completions_user_updated on public.task_completions(user_id, updated_at);

create index if not exists idx_books_user_id on public.books(user_id);
create index if not exists idx_books_user_updated on public.books(user_id, updated_at);

create index if not exists idx_wishlist_user_id on public.wishlist(user_id);
create index if not exists idx_wishlist_user_updated on public.wishlist(user_id, updated_at);

create index if not exists idx_concepts_user_id on public.core_concepts(user_id);
create index if not exists idx_concepts_user_updated on public.core_concepts(user_id, updated_at);

create index if not exists idx_side_quests_user_id on public.side_quests(user_id);
create index if not exists idx_side_quests_user_date on public.side_quests(user_id, date);
create index if not exists idx_side_quests_user_updated on public.side_quests(user_id, updated_at);

create index if not exists idx_dues_user_id on public.dues(user_id);
create index if not exists idx_dues_user_updated on public.dues(user_id, updated_at);

create index if not exists idx_fitness_user_id on public.fitness_logs(user_id);
create index if not exists idx_fitness_user_updated on public.fitness_logs(user_id, updated_at);

create index if not exists idx_daily_focus_user_id on public.daily_focus(user_id);
create index if not exists idx_daily_focus_user_updated on public.daily_focus(user_id, updated_at);

create index if not exists idx_whatsapp_reminders_user_id on public.whatsapp_reminders(user_id);

-- 4. Automated PostgreSQL Updated_At Trigger Function
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_tasks_set_updated_at on public.tasks;
create trigger trg_tasks_set_updated_at before update on public.tasks for each row execute function public.set_updated_at();

drop trigger if exists trg_completions_set_updated_at on public.task_completions;
create trigger trg_completions_set_updated_at before update on public.task_completions for each row execute function public.set_updated_at();

drop trigger if exists trg_books_set_updated_at on public.books;
create trigger trg_books_set_updated_at before update on public.books for each row execute function public.set_updated_at();

drop trigger if exists trg_wishlist_set_updated_at on public.wishlist;
create trigger trg_wishlist_set_updated_at before update on public.wishlist for each row execute function public.set_updated_at();

drop trigger if exists trg_concepts_set_updated_at on public.core_concepts;
create trigger trg_concepts_set_updated_at before update on public.core_concepts for each row execute function public.set_updated_at();

drop trigger if exists trg_settings_set_updated_at on public.profile_settings;
create trigger trg_settings_set_updated_at before update on public.profile_settings for each row execute function public.set_updated_at();

drop trigger if exists trg_side_quests_set_updated_at on public.side_quests;
create trigger trg_side_quests_set_updated_at before update on public.side_quests for each row execute function public.set_updated_at();

drop trigger if exists trg_dues_set_updated_at on public.dues;
create trigger trg_dues_set_updated_at before update on public.dues for each row execute function public.set_updated_at();

drop trigger if exists trg_fitness_set_updated_at on public.fitness_logs;
create trigger trg_fitness_set_updated_at before update on public.fitness_logs for each row execute function public.set_updated_at();

drop trigger if exists trg_daily_focus_set_updated_at on public.daily_focus;
create trigger trg_daily_focus_set_updated_at before update on public.daily_focus for each row execute function public.set_updated_at();

-- 5. Row-Level Security (RLS) & Granular Policy Definitions
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
alter table public.whatsapp_reminders enable row level security;

-- Tasks Policies
drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select" on public.tasks for select using (auth.uid() = user_id);
drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert" on public.tasks for insert with check (auth.uid() = user_id);
drop policy if exists "tasks_update" on public.tasks;
create policy "tasks_update" on public.tasks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "tasks_delete" on public.tasks;
create policy "tasks_delete" on public.tasks for delete using (auth.uid() = user_id);

-- Completions Policies
drop policy if exists "completions_select" on public.task_completions;
create policy "completions_select" on public.task_completions for select using (auth.uid() = user_id);
drop policy if exists "completions_insert" on public.task_completions;
create policy "completions_insert" on public.task_completions for insert with check (auth.uid() = user_id);
drop policy if exists "completions_update" on public.task_completions;
create policy "completions_update" on public.task_completions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "completions_delete" on public.task_completions;
create policy "completions_delete" on public.task_completions for delete using (auth.uid() = user_id);

-- Books Policies
drop policy if exists "books_select" on public.books;
create policy "books_select" on public.books for select using (auth.uid() = user_id);
drop policy if exists "books_insert" on public.books;
create policy "books_insert" on public.books for insert with check (auth.uid() = user_id);
drop policy if exists "books_update" on public.books;
create policy "books_update" on public.books for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "books_delete" on public.books;
create policy "books_delete" on public.books for delete using (auth.uid() = user_id);

-- Wishlist Policies
drop policy if exists "wishlist_select" on public.wishlist;
create policy "wishlist_select" on public.wishlist for select using (auth.uid() = user_id);
drop policy if exists "wishlist_insert" on public.wishlist;
create policy "wishlist_insert" on public.wishlist for insert with check (auth.uid() = user_id);
drop policy if exists "wishlist_update" on public.wishlist;
create policy "wishlist_update" on public.wishlist for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "wishlist_delete" on public.wishlist;
create policy "wishlist_delete" on public.wishlist for delete using (auth.uid() = user_id);

-- Core Concepts Policies
drop policy if exists "concepts_select" on public.core_concepts;
create policy "concepts_select" on public.core_concepts for select using (auth.uid() = user_id);
drop policy if exists "concepts_insert" on public.core_concepts;
create policy "concepts_insert" on public.core_concepts for insert with check (auth.uid() = user_id);
drop policy if exists "concepts_update" on public.core_concepts;
create policy "concepts_update" on public.core_concepts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "concepts_delete" on public.core_concepts;
create policy "concepts_delete" on public.core_concepts for delete using (auth.uid() = user_id);

-- Profile Settings Policies
drop policy if exists "settings_select" on public.profile_settings;
create policy "settings_select" on public.profile_settings for select using (auth.uid() = user_id);
drop policy if exists "settings_insert" on public.profile_settings;
create policy "settings_insert" on public.profile_settings for insert with check (auth.uid() = user_id);
drop policy if exists "settings_update" on public.profile_settings;
create policy "settings_update" on public.profile_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "settings_delete" on public.profile_settings;
create policy "settings_delete" on public.profile_settings for delete using (auth.uid() = user_id);

-- Side Quests Policies
drop policy if exists "side_quests_select" on public.side_quests;
create policy "side_quests_select" on public.side_quests for select using (auth.uid() = user_id);
drop policy if exists "side_quests_insert" on public.side_quests;
create policy "side_quests_insert" on public.side_quests for insert with check (auth.uid() = user_id);
drop policy if exists "side_quests_update" on public.side_quests;
create policy "side_quests_update" on public.side_quests for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "side_quests_delete" on public.side_quests;
create policy "side_quests_delete" on public.side_quests for delete using (auth.uid() = user_id);

-- Dues Policies
drop policy if exists "dues_select" on public.dues;
create policy "dues_select" on public.dues for select using (auth.uid() = user_id);
drop policy if exists "dues_insert" on public.dues;
create policy "dues_insert" on public.dues for insert with check (auth.uid() = user_id);
drop policy if exists "dues_update" on public.dues;
create policy "dues_update" on public.dues for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "dues_delete" on public.dues;
create policy "dues_delete" on public.dues for delete using (auth.uid() = user_id);

-- Fitness Logs Policies
drop policy if exists "fitness_select" on public.fitness_logs;
create policy "fitness_select" on public.fitness_logs for select using (auth.uid() = user_id);
drop policy if exists "fitness_insert" on public.fitness_logs;
create policy "fitness_insert" on public.fitness_logs for insert with check (auth.uid() = user_id);
drop policy if exists "fitness_update" on public.fitness_logs;
create policy "fitness_update" on public.fitness_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "fitness_delete" on public.fitness_logs;
create policy "fitness_delete" on public.fitness_logs for delete using (auth.uid() = user_id);

-- Daily Focus Policies
drop policy if exists "daily_focus_select" on public.daily_focus;
create policy "daily_focus_select" on public.daily_focus for select using (auth.uid() = user_id);
drop policy if exists "daily_focus_insert" on public.daily_focus;
create policy "daily_focus_insert" on public.daily_focus for insert with check (auth.uid() = user_id);
drop policy if exists "daily_focus_update" on public.daily_focus;
create policy "daily_focus_update" on public.daily_focus for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "daily_focus_delete" on public.daily_focus;
create policy "daily_focus_delete" on public.daily_focus for delete using (auth.uid() = user_id);

-- WhatsApp Reminders Policies
drop policy if exists "whatsapp_select" on public.whatsapp_reminders;
create policy "whatsapp_select" on public.whatsapp_reminders for select using (auth.uid() = user_id);
drop policy if exists "whatsapp_insert" on public.whatsapp_reminders;
create policy "whatsapp_insert" on public.whatsapp_reminders for insert with check (auth.uid() = user_id);
drop policy if exists "whatsapp_update" on public.whatsapp_reminders;
create policy "whatsapp_update" on public.whatsapp_reminders for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "whatsapp_delete" on public.whatsapp_reminders;
create policy "whatsapp_delete" on public.whatsapp_reminders for delete using (auth.uid() = user_id);
