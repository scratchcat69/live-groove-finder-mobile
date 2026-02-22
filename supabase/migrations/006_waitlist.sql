-- Waitlist signups from landing page
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  source text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.waitlist enable row level security;

-- Allow anonymous inserts (landing page visitors aren't authenticated)
create policy "Anyone can join the waitlist"
  on public.waitlist
  for insert
  with check (true);

-- No SELECT/UPDATE/DELETE policies — only accessible via Supabase dashboard / service role
