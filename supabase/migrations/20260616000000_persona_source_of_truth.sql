create extension if not exists pgcrypto;

create table if not exists public.personas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  base_tone text not null,
  relationship_type text not null,
  world_type text not null,
  static_prompt_json jsonb not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

alter table public.personas
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists base_tone text,
  add column if not exists relationship_type text,
  add column if not exists world_type text,
  add column if not exists static_prompt_json jsonb,
  add column if not exists version integer not null default 1,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz null;

alter table public.personas
  alter column user_id set not null,
  alter column base_tone set not null,
  alter column relationship_type set not null,
  alter column world_type set not null,
  alter column static_prompt_json set not null;

create table if not exists public.persona_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  persona_id uuid not null references public.personas(id) on delete cascade,
  relationship_stage text not null,
  affinity integer not null check (affinity >= 0 and affinity <= 100),
  trust_state text not null check (trust_state in ('stable', 'strained', 'repair_needed')),
  recent_mood text null,
  open_loops jsonb not null default '[]'::jsonb,
  last_major_event text null,
  boundary_overrides jsonb not null default '{}'::jsonb,
  state_source text not null check (state_source in ('conversation', 'explicit_user_edit', 'system')),
  version integer not null default 1,
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists personas_user_id_version_idx
  on public.personas(user_id, version)
  where deleted_at is null;

create index if not exists persona_states_user_persona_idx
  on public.persona_states(user_id, persona_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists personas_set_updated_at on public.personas;
create trigger personas_set_updated_at
before update on public.personas
for each row execute function public.set_updated_at();

drop trigger if exists persona_states_set_updated_at on public.persona_states;
create trigger persona_states_set_updated_at
before update on public.persona_states
for each row execute function public.set_updated_at();

alter table public.personas enable row level security;
alter table public.persona_states enable row level security;

drop policy if exists personas_select_own on public.personas;
create policy personas_select_own
on public.personas
for select
using (user_id = auth.uid());

drop policy if exists personas_insert_own on public.personas;
create policy personas_insert_own
on public.personas
for insert
with check (user_id = auth.uid());

drop policy if exists personas_update_own on public.personas;
create policy personas_update_own
on public.personas
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists persona_states_select_own on public.persona_states;
create policy persona_states_select_own
on public.persona_states
for select
using (user_id = auth.uid());

drop policy if exists persona_states_insert_own on public.persona_states;
create policy persona_states_insert_own
on public.persona_states
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.personas
    where personas.id = persona_states.persona_id
      and personas.user_id = auth.uid()
      and personas.deleted_at is null
  )
);

drop policy if exists persona_states_update_own on public.persona_states;
create policy persona_states_update_own
on public.persona_states
for update
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.personas
    where personas.id = persona_states.persona_id
      and personas.user_id = auth.uid()
      and personas.deleted_at is null
  )
);

create or replace function public.update_persona_with_version(
  p_persona_id uuid,
  p_expected_version integer,
  p_name text,
  p_base_tone text,
  p_relationship_type text,
  p_world_type text,
  p_static_prompt_json jsonb
)
returns public.personas
language plpgsql
as $$
declare
  updated_persona public.personas;
begin
  update public.personas
  set
    name = p_name,
    base_tone = p_base_tone,
    relationship_type = p_relationship_type,
    world_type = p_world_type,
    static_prompt_json = p_static_prompt_json,
    version = version + 1
  where id = p_persona_id
    and user_id = auth.uid()
    and version = p_expected_version
    and deleted_at is null
  returning * into updated_persona;

  if updated_persona.id is null then
    raise exception 'persona_version_conflict'
      using errcode = 'P0001';
  end if;

  return updated_persona;
end;
$$;

create or replace function public.soft_delete_persona(
  p_persona_id uuid,
  p_expected_version integer
)
returns public.personas
language plpgsql
as $$
declare
  updated_persona public.personas;
begin
  update public.personas
  set
    deleted_at = now(),
    version = version + 1
  where id = p_persona_id
    and user_id = auth.uid()
    and version = p_expected_version
    and deleted_at is null
  returning * into updated_persona;

  if updated_persona.id is null then
    raise exception 'persona_version_conflict'
      using errcode = 'P0001';
  end if;

  return updated_persona;
end;
$$;
