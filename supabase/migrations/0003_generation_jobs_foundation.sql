alter table public.llm_key_vault_entries
  drop constraint if exists llm_key_vault_entries_provider_check;

alter table public.llm_key_vault_entries
  add constraint llm_key_vault_entries_provider_check
  check (
    provider in (
      'openai',
      'anthropic',
      'gemini',
      'deepseek',
      'openrouter',
      'groq',
      'mistral',
      'together',
      'fireworks',
      'cerebras',
      'perplexity',
      'xai',
      'ollama',
      'vllm'
    )
  );

create table public.provider_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  default_model text,
  default_key_vault_entry_id uuid references public.llm_key_vault_entries(id) on delete set null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create table public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  application_id uuid references public.applications(id) on delete cascade,
  preset_id uuid references public.presets(id) on delete set null,
  master_profile_id uuid references public.master_profiles(id) on delete set null,
  docx_template_id uuid references public.docx_templates(id) on delete set null,
  provider_key_id uuid references public.llm_key_vault_entries(id) on delete set null,
  provider text not null,
  model text not null,
  job_description text not null,
  source_url text,
  idempotency_key text not null,
  queue_name text not null default 'generation',
  queue_job_id text,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  progress_label text not null default 'Queued',
  attempts integer not null default 0,
  safe_error_code text,
  safe_error_message text,
  result_generation_run_id uuid references public.generation_runs(id) on delete set null,
  result_document_ids uuid[] not null default '{}'::uuid[],
  token_input integer not null default 0,
  token_output integer not null default 0,
  estimated_cost_micros integer not null default 0,
  metrics jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table public.scheduled_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  application_id uuid references public.applications(id) on delete cascade,
  kind text not null check (kind in ('follow_up', 'interview_prep', 'stale_application')),
  message text not null,
  run_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'queued', 'sent', 'cancelled', 'failed')),
  queue_job_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  actor text not null default 'user',
  safe_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index generation_jobs_user_status_idx
  on public.generation_jobs (user_id, status, created_at desc);

create index generation_jobs_queue_idx
  on public.generation_jobs (queue_name, queue_job_id);

create index scheduled_reminders_due_idx
  on public.scheduled_reminders (status, run_at);

alter table public.provider_preferences enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.scheduled_reminders enable row level security;
alter table public.audit_events enable row level security;

drop trigger if exists provider_preferences_set_updated_at on public.provider_preferences;
create trigger provider_preferences_set_updated_at
  before update on public.provider_preferences
  for each row execute function public.set_updated_at();

drop trigger if exists generation_jobs_set_updated_at on public.generation_jobs;
create trigger generation_jobs_set_updated_at
  before update on public.generation_jobs
  for each row execute function public.set_updated_at();

drop trigger if exists scheduled_reminders_set_updated_at on public.scheduled_reminders;
create trigger scheduled_reminders_set_updated_at
  before update on public.scheduled_reminders
  for each row execute function public.set_updated_at();

create policy "Users manage own provider preferences" on public.provider_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users read own generation jobs" on public.generation_jobs
  for select using (auth.uid() = user_id);

create policy "Users create own generation jobs" on public.generation_jobs
  for insert with check (auth.uid() = user_id);

create policy "Users update cancellable own generation jobs" on public.generation_jobs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own reminders" on public.scheduled_reminders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users read own audit events" on public.audit_events
  for select using (auth.uid() = user_id);
