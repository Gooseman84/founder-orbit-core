
-- 1. validation_sessions
create table public.validation_sessions (
  id uuid primary key default gen_random_uuid(),
  venture_id uuid references public.ventures(id) on delete cascade,
  user_id uuid not null,
  status text default 'active',
  validation_stage text,
  hypothesis text,
  target_evidence_count int default 5,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.validation_sessions enable row level security;

create policy "Users can select own validation_sessions" on public.validation_sessions for select using (auth.uid() = user_id);
create policy "Users can insert own validation_sessions" on public.validation_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own validation_sessions" on public.validation_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own validation_sessions" on public.validation_sessions for delete using (auth.uid() = user_id);

create trigger set_validation_sessions_updated_at
  before update on public.validation_sessions
  for each row execute function public.set_updated_at();

-- 2. validation_evidence
create table public.validation_evidence (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.validation_sessions(id) on delete cascade,
  venture_id uuid references public.ventures(id),
  user_id uuid not null,
  evidence_type text,
  raw_notes text,
  guided_answers jsonb,
  key_insight text,
  sentiment text,
  fvs_dimension text,
  signal_strength int check (signal_strength between 1 and 5),
  contradicts_assumption boolean default false,
  assumption_reference text,
  created_at timestamptz default now()
);

alter table public.validation_evidence enable row level security;

create policy "Users can select own validation_evidence" on public.validation_evidence for select using (auth.uid() = user_id);
create policy "Users can insert own validation_evidence" on public.validation_evidence for insert with check (auth.uid() = user_id);
create policy "Users can update own validation_evidence" on public.validation_evidence for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own validation_evidence" on public.validation_evidence for delete using (auth.uid() = user_id);

-- 3. validation_summaries
create table public.validation_summaries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.validation_sessions(id),
  venture_id uuid references public.ventures(id),
  user_id uuid not null,
  total_evidence_count int,
  positive_count int,
  negative_count int,
  neutral_count int,
  pattern_summary text,
  advisor_note text,
  recommendation text,
  fvs_delta jsonb,
  confidence_shift text,
  generated_at timestamptz default now()
);

alter table public.validation_summaries enable row level security;

create policy "Users can select own validation_summaries" on public.validation_summaries for select using (auth.uid() = user_id);
create policy "Users can insert own validation_summaries" on public.validation_summaries for insert with check (auth.uid() = user_id);
create policy "Users can update own validation_summaries" on public.validation_summaries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own validation_summaries" on public.validation_summaries for delete using (auth.uid() = user_id);

-- 4. validation_missions
create table public.validation_missions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.validation_sessions(id),
  venture_id uuid references public.ventures(id),
  user_id uuid not null,
  mission_title text,
  mission_detail text,
  suggested_questions jsonb,
  target_fvs_dimension text,
  status text default 'pending',
  completed_at timestamptz,
  created_at timestamptz default now()
);

alter table public.validation_missions enable row level security;

create policy "Users can select own validation_missions" on public.validation_missions for select using (auth.uid() = user_id);
create policy "Users can insert own validation_missions" on public.validation_missions for insert with check (auth.uid() = user_id);
create policy "Users can update own validation_missions" on public.validation_missions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own validation_missions" on public.validation_missions for delete using (auth.uid() = user_id);
