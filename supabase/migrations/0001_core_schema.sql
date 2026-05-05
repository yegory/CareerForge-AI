create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.master_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  content jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.docx_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  storage_path text not null,
  placeholders jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  master_profile_id uuid not null references public.master_profiles(id) on delete restrict,
  docx_template_id uuid not null references public.docx_templates(id) on delete restrict,
  tone_rules jsonb not null default '{}'::jsonb,
  default_provider text not null default 'openai',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.llm_key_vault_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('openai', 'anthropic', 'gemini', 'deepseek')),
  label text not null,
  key_fingerprint text not null,
  encrypted_key text not null,
  encryption_nonce text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, label)
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company text not null,
  role_title text not null,
  job_description text not null,
  source_url text,
  status text not null default 'draft' check (status in ('draft', 'applied', 'interviewing', 'offer', 'rejected', 'archived')),
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.generation_runs (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  preset_id uuid references public.presets(id) on delete set null,
  provider text not null,
  model text not null,
  prompt_fingerprint text not null,
  jd_analysis jsonb not null,
  generated_content jsonb not null,
  match_result jsonb not null,
  constraint_result jsonb not null,
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  generation_run_id uuid references public.generation_runs(id) on delete set null,
  kind text not null check (kind in ('resume_docx', 'resume_pdf', 'cover_letter_docx', 'cover_letter_pdf')),
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table public.application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  body text,
  occurred_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.master_profiles enable row level security;
alter table public.docx_templates enable row level security;
alter table public.presets enable row level security;
alter table public.llm_key_vault_entries enable row level security;
alter table public.applications enable row level security;
alter table public.generation_runs enable row level security;
alter table public.documents enable row level security;
alter table public.application_events enable row level security;

create policy "Users manage own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users manage own master profiles" on public.master_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own templates" on public.docx_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own presets" on public.presets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own key vault entries" on public.llm_key_vault_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own applications" on public.applications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users read own generation runs" on public.generation_runs
  for select using (
    exists (
      select 1 from public.applications
      where applications.id = generation_runs.application_id
      and applications.user_id = auth.uid()
    )
  );

create policy "Users create own generation runs" on public.generation_runs
  for insert with check (
    exists (
      select 1 from public.applications
      where applications.id = generation_runs.application_id
      and applications.user_id = auth.uid()
    )
  );

create policy "Users manage own documents" on public.documents
  for all using (
    exists (
      select 1 from public.applications
      where applications.id = documents.application_id
      and applications.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.applications
      where applications.id = documents.application_id
      and applications.user_id = auth.uid()
    )
  );

create policy "Users manage own application events" on public.application_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
