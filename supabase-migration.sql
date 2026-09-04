-- ============================================================
-- Central de Rotina — tabelas relacionais
-- Rode este script inteiro de uma vez no SQL Editor do Supabase.
-- Ele é seguro de rodar mais de uma vez (idempotente): "if not exists"
-- e "on conflict do nothing" evitam duplicar tabelas ou linhas.
-- ============================================================

create table if not exists public.rotina_companies (
  id text primary key,
  name text not null,
  segment text,
  city text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.rotina_people (
  id text primary key,
  name text not null,
  company_id text references public.rotina_companies(id) on delete set null,
  role text,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.rotina_categories (
  name text primary key
);

create table if not exists public.rotina_tasks (
  id text primary key,
  title text not null,
  description text,
  created_at text,
  due_date date,
  due_time text,
  priority text,
  status text,
  category text,
  subcategory text,
  person_id text references public.rotina_people(id) on delete set null,
  company_id text references public.rotina_companies(id) on delete set null,
  origin_type text,
  origin_id text,
  related_task_ids text[] not null default '{}',
  notes text,
  attachments_note text,
  completed_at text,
  completion_note text,
  recurring_template_id text,
  in_inbox boolean not null default false,
  history jsonb not null default '[]'::jsonb
);

create table if not exists public.rotina_activities (
  id text primary key,
  title text not null,
  description text,
  created_at text,
  category text,
  company_id text references public.rotina_companies(id) on delete set null,
  person_id text references public.rotina_people(id) on delete set null,
  generated_task_ids text[] not null default '{}'
);

create table if not exists public.rotina_recurring (
  id text primary key,
  title text not null,
  description text,
  category text,
  priority text,
  company_id text references public.rotina_companies(id) on delete set null,
  person_id text references public.rotina_people(id) on delete set null,
  due_time text,
  rule jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  next_due_date date
);

alter table public.rotina_companies enable row level security;
alter table public.rotina_people enable row level security;
alter table public.rotina_categories enable row level security;
alter table public.rotina_tasks enable row level security;
alter table public.rotina_activities enable row level security;
alter table public.rotina_recurring enable row level security;

drop policy if exists "Permitir tudo - rotina_companies" on public.rotina_companies;
create policy "Permitir tudo - rotina_companies" on public.rotina_companies for all using (true) with check (true);

drop policy if exists "Permitir tudo - rotina_people" on public.rotina_people;
create policy "Permitir tudo - rotina_people" on public.rotina_people for all using (true) with check (true);

drop policy if exists "Permitir tudo - rotina_categories" on public.rotina_categories;
create policy "Permitir tudo - rotina_categories" on public.rotina_categories for all using (true) with check (true);

drop policy if exists "Permitir tudo - rotina_tasks" on public.rotina_tasks;
create policy "Permitir tudo - rotina_tasks" on public.rotina_tasks for all using (true) with check (true);

drop policy if exists "Permitir tudo - rotina_activities" on public.rotina_activities;
create policy "Permitir tudo - rotina_activities" on public.rotina_activities for all using (true) with check (true);

drop policy if exists "Permitir tudo - rotina_recurring" on public.rotina_recurring;
create policy "Permitir tudo - rotina_recurring" on public.rotina_recurring for all using (true) with check (true);

-- ============================================================
-- Migração dos dados que já existiam no formato antigo
-- (um único JSON dentro de rotina_app_storage).
-- Se essa tabela não existir ou estiver vazia, o bloco abaixo
-- simplesmente não faz nada — sem erro.
-- ============================================================

do $$
declare
  blob text;
  payload jsonb;
  table_exists boolean;
begin
  select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'rotina_app_storage'
  ) into table_exists;

  if not table_exists then
    raise notice 'Tabela rotina_app_storage não existe — nada para migrar.';
    return;
  end if;

  execute 'select value from public.rotina_app_storage where key = $1 and shared = false'
    into blob using 'brdata-rotina-app-v1';

  if blob is null then
    raise notice 'Nenhum dado encontrado em rotina_app_storage para migrar.';
    return;
  end if;

  payload := blob::jsonb;

  insert into public.rotina_companies (id, name, segment, city, notes)
  select x->>'id', coalesce(x->>'name',''), x->>'segment', x->>'city', x->>'notes'
  from jsonb_array_elements(coalesce(payload->'companies','[]'::jsonb)) x
  where x->>'id' is not null
  on conflict (id) do nothing;

  insert into public.rotina_people (id, name, company_id, role, email, phone, notes)
  select x->>'id', coalesce(x->>'name',''), x->>'companyId', x->>'role', x->>'email', x->>'phone', x->>'notes'
  from jsonb_array_elements(coalesce(payload->'people','[]'::jsonb)) x
  where x->>'id' is not null
  on conflict (id) do nothing;

  insert into public.rotina_categories (name)
  select distinct x
  from jsonb_array_elements_text(coalesce(payload->'categories','[]'::jsonb)) x
  on conflict (name) do nothing;

  insert into public.rotina_tasks (
    id, title, description, created_at, due_date, due_time, priority, status,
    category, subcategory, person_id, company_id, origin_type, origin_id,
    related_task_ids, notes, attachments_note, completed_at, completion_note,
    recurring_template_id, in_inbox, history
  )
  select
    x->>'id', coalesce(x->>'title',''), x->>'description', x->>'createdAt',
    nullif(x->>'dueDate','')::date, x->>'dueTime', x->>'priority', x->>'status',
    x->>'category', x->>'subcategory', x->>'personId', x->>'companyId',
    x->>'originType', x->>'originId',
    coalesce((select array_agg(e) from jsonb_array_elements_text(coalesce(x->'relatedTaskIds','[]'::jsonb)) e), '{}'),
    x->>'notes', x->>'attachmentsNote', x->>'completedAt', x->>'completionNote',
    x->>'recurringTemplateId', coalesce((x->>'inInbox')::boolean, false),
    coalesce(x->'history','[]'::jsonb)
  from jsonb_array_elements(coalesce(payload->'tasks','[]'::jsonb)) x
  where x->>'id' is not null
  on conflict (id) do nothing;

  insert into public.rotina_activities (id, title, description, created_at, category, company_id, person_id, generated_task_ids)
  select
    x->>'id', coalesce(x->>'title',''), x->>'description', x->>'createdAt', x->>'category',
    x->>'companyId', x->>'personId',
    coalesce((select array_agg(e) from jsonb_array_elements_text(coalesce(x->'generatedTaskIds','[]'::jsonb)) e), '{}')
  from jsonb_array_elements(coalesce(payload->'activities','[]'::jsonb)) x
  where x->>'id' is not null
  on conflict (id) do nothing;

  insert into public.rotina_recurring (id, title, description, category, priority, company_id, person_id, due_time, rule, active, next_due_date)
  select
    x->>'id', coalesce(x->>'title',''), x->>'description', x->>'category', x->>'priority',
    x->>'companyId', x->>'personId', x->>'dueTime', coalesce(x->'rule','{}'::jsonb),
    coalesce((x->>'active')::boolean, true), nullif(x->>'nextDueDate','')::date
  from jsonb_array_elements(coalesce(payload->'recurring','[]'::jsonb)) x
  where x->>'id' is not null
  on conflict (id) do nothing;

  raise notice 'Migração concluída.';
end $$;
