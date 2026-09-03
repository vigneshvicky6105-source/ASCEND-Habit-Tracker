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
  recovered boolean not null default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Enable Row Level Security (RLS) on all tables
alter table public.tasks enable row level security;
alter table public.task_completions enable row level security;
alter table public.books enable row level security;
alter table public.wishlist enable row level security;
alter table public.core_concepts enable row level security;
alter table public.profile_settings enable row level security;
alter table public.side_quests enable row level security;

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

alter table public.side_quests add column if not exists recovered boolean not null default false;

-- 8. Dues (Lent & Owed Tracker)
create table if not exists public.dues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('lent', 'owed')),
  person_name text not null,
  original_amount numeric not null default 0,
  amount_paid numeric not null default 0,
  is_emi boolean default false,
  emi_amount numeric default 0,
  total_emis integer default 0,
  emis_paid integer default 0,
  date date not null default CURRENT_DATE,
  due_date date,
  due_time text default '',
  notify_lead text default '10m',
  reason text default '',
  status text not null default 'Pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dues enable row level security;

drop policy if exists "dues own" on public.dues;
create policy "dues own" on public.dues for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Migration safety helpers for dues table
alter table public.dues add column if not exists is_emi boolean default false;
alter table public.dues add column if not exists emi_amount numeric default 0;
alter table public.dues add column if not exists total_emis integer default 0;
alter table public.dues add column if not exists emis_paid integer default 0;
alter table public.dues add column if not exists due_time text default '';
alter table public.dues add column if not exists notify_lead text default '10m';

-- 9. Lending (Full EMI Lending System)
create table if not exists public.lending (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_name text not null,
  phone_number text default '',
  whatsapp_number text default '',
  principal_amount numeric not null default 0,
  interest_enabled boolean default false,
  interest_type text default 'flat',
  interest_rate numeric default 0,
  interest_amount numeric default 0,
  total_repayment numeric default 0,
  emi_enabled boolean default true,
  emi_count integer default 1,
  start_date date not null default CURRENT_DATE,
  first_due_date date,
  status text not null default 'Active',
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 10. Lending Installments (EMI Schedule)
create table if not exists public.lending_installments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lending_id uuid not null references public.lending(id) on delete cascade,
  installment_number integer not null,
  due_date date not null,
  amount numeric not null default 0,
  paid_amount numeric not null default 0,
  status text not null default 'Pending',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 11. Lending Payments History
create table if not exists public.lending_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lending_id uuid not null references public.lending(id) on delete cascade,
  installment_id uuid references public.lending_installments(id) on delete cascade,
  amount numeric not null default 0,
  payment_date date not null default CURRENT_DATE,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 12. WhatsApp Reminders Log
create table if not exists public.whatsapp_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lending_id uuid not null references public.lending(id) on delete cascade,
  installment_id uuid references public.lending_installments(id) on delete cascade,
  reminder_type text not null default 'due_date',
  scheduled_at timestamptz,
  sent_at timestamptz,
  provider_message_id text default '',
  status text not null default 'Pending',
  failure_reason text default '',
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS on new tables
alter table public.lending enable row level security;
alter table public.lending_installments enable row level security;
alter table public.lending_payments enable row level security;
alter table public.whatsapp_reminders enable row level security;

-- Policies for new tables
drop policy if exists "lending own" on public.lending;
create policy "lending own" on public.lending for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "lending_installments own" on public.lending_installments;
create policy "lending_installments own" on public.lending_installments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "lending_payments own" on public.lending_payments;
create policy "lending_payments own" on public.lending_payments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "whatsapp_reminders own" on public.whatsapp_reminders;
create policy "whatsapp_reminders own" on public.whatsapp_reminders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 13. Enable Realtime Publications for all user-scoped tables
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.task_completions;
alter publication supabase_realtime add table public.books;
alter publication supabase_realtime add table public.wishlist;
alter publication supabase_realtime add table public.core_concepts;
alter publication supabase_realtime add table public.profile_settings;
alter publication supabase_realtime add table public.side_quests;
alter publication supabase_realtime add table public.dues;
alter publication supabase_realtime add table public.lending;
alter publication supabase_realtime add table public.lending_installments;
alter publication supabase_realtime add table public.lending_payments;
alter publication supabase_realtime add table public.whatsapp_reminders;




