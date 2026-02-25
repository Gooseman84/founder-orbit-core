
create table founder_patterns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  venture_id uuid references ventures(id) on delete cascade,
  pattern_type text not null,
  pattern_description text not null,
  advisor_note text not null,
  evidence_references jsonb,
  severity text default 'medium',
  status text default 'active',
  dismissed_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table founder_patterns enable row level security;

create policy "Users can read own patterns"
  on founder_patterns for select
  using (auth.uid() = user_id);

create policy "Users can update own patterns"
  on founder_patterns for update
  using (auth.uid() = user_id);

create policy "Service role can insert patterns"
  on founder_patterns for insert
  with check (true);

create unique index founder_patterns_active_unique
  on founder_patterns (user_id, venture_id, pattern_type)
  where status = 'active';

create trigger update_founder_patterns_updated_at
  before update on founder_patterns
  for each row execute function update_updated_at_column();
