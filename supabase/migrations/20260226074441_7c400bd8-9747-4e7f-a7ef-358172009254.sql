
create table public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  feedback_type text not null,
  sentiment text,
  nps_score int,
  message text,
  page_url text,
  venture_id uuid,
  created_at timestamptz default now()
);

alter table public.beta_feedback enable row level security;

create policy "Users can insert own feedback"
  on public.beta_feedback for insert
  with check (auth.uid() = user_id);

create policy "Service role can read all feedback"
  on public.beta_feedback for select
  using (auth.role() = 'service_role');
