-- Create user_intake_extended table
create table if not exists public.user_intake_extended (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Long-form answers
  deep_desires text,
  fears text,
  identity_statements text,
  energy_givers text,
  energy_drainers text,

  -- Structured answers
  business_archetypes jsonb,  -- e.g. ["saas","content_brand"]
  work_preferences jsonb,     -- e.g. ["selling","systems"]
  personality_flags jsonb,    -- e.g. { "wants_autopilot": true, ... }

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create unique index on user_id
create unique index if not exists user_intake_extended_user_id_idx
  on public.user_intake_extended (user_id);

-- Enable RLS
alter table public.user_intake_extended enable row level security;

-- RLS policy for users to manage their own data
create policy "Users can manage their own extended intake"
  on public.user_intake_extended
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Create updated_at trigger function if not exists
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

-- Create trigger for updated_at
create trigger set_user_intake_extended_updated_at
before update on public.user_intake_extended
for each row execute procedure public.set_updated_at();