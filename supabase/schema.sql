-- Run once in Supabase: SQL Editor > New query > paste > Run.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  weight_kg numeric, height_cm numeric, age int, sex text, activity numeric,
  start_date date, reminders jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);
create table if not exists public.looks_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  score numeric not null, result jsonb not null, thumb text
);
create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  eaten_on date not null, name text not null, kcal int not null,
  health_score int, items jsonb, thumb text, notes text
);
create index if not exists meals_user_day on public.meals (user_id, eaten_on);

alter table public.profiles enable row level security;
alter table public.looks_ratings enable row level security;
alter table public.meals enable row level security;

create policy "own profile" on public.profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own ratings" on public.looks_ratings for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own meals" on public.meals for all using (user_id = auth.uid()) with check (user_id = auth.uid());
