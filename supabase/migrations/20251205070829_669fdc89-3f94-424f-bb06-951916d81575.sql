-- Create founder_interviews table for dynamic founder interview engine
create table if not exists public.founder_interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  status text not null default 'in_progress', -- 'in_progress' | 'completed'
  transcript jsonb not null default '[]'::jsonb, -- array of {role: 'system' | 'ai' | 'user', content: string}
  context_summary jsonb,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists founder_interviews_user_id_idx on public.founder_interviews (user_id);
create index if not exists founder_interviews_status_idx on public.founder_interviews (status);

-- Enable RLS so users can only access their own interview sessions
alter table public.founder_interviews enable row level security;

create policy "Users can manage their own interviews"
  on public.founder_interviews
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Keep updated_at in sync
create trigger set_founder_interviews_updated_at
  before update on public.founder_interviews
  for each row
  execute function public.update_updated_at_column();