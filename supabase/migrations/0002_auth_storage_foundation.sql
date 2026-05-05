create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists master_profiles_set_updated_at on public.master_profiles;
create trigger master_profiles_set_updated_at
  before update on public.master_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists docx_templates_set_updated_at on public.docx_templates;
create trigger docx_templates_set_updated_at
  before update on public.docx_templates
  for each row execute function public.set_updated_at();

drop trigger if exists presets_set_updated_at on public.presets;
create trigger presets_set_updated_at
  before update on public.presets
  for each row execute function public.set_updated_at();

drop trigger if exists llm_key_vault_entries_set_updated_at on public.llm_key_vault_entries;
create trigger llm_key_vault_entries_set_updated_at
  before update on public.llm_key_vault_entries
  for each row execute function public.set_updated_at();

drop trigger if exists applications_set_updated_at on public.applications;
create trigger applications_set_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'templates',
  'templates',
  false,
  10485760,
  array[
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/pdf',
    'text/plain'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'generated-documents',
  'generated-documents',
  false,
  10485760,
  array[
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/pdf',
    'text/plain'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Users read own template files" on storage.objects
  for select using (
    bucket_id = 'templates'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users upload own template files" on storage.objects
  for insert with check (
    bucket_id = 'templates'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users update own template files" on storage.objects
  for update using (
    bucket_id = 'templates'
    and auth.uid()::text = (storage.foldername(name))[1]
  ) with check (
    bucket_id = 'templates'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users delete own template files" on storage.objects
  for delete using (
    bucket_id = 'templates'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users read own generated documents" on storage.objects
  for select using (
    bucket_id = 'generated-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users upload own generated documents" on storage.objects
  for insert with check (
    bucket_id = 'generated-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users update own generated documents" on storage.objects
  for update using (
    bucket_id = 'generated-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  ) with check (
    bucket_id = 'generated-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users delete own generated documents" on storage.objects
  for delete using (
    bucket_id = 'generated-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
