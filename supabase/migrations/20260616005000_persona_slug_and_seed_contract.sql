alter table public.personas
  add column if not exists slug text;

update public.personas
set slug = coalesce(
  slug,
  nullif(static_prompt_json #>> '{identity,id}', ''),
  lower(regexp_replace(name, '[^a-zA-Z0-9가-힣]+', '-', 'g'))
)
where slug is null;

alter table public.personas
  alter column slug set not null;

create unique index if not exists personas_user_slug_active_idx
  on public.personas(user_id, slug)
  where deleted_at is null;

drop policy if exists personas_select_own on public.personas;
create policy personas_select_own
on public.personas
for select
using (
  user_id = auth.uid()
  and deleted_at is null
);

drop policy if exists personas_insert_own on public.personas;
create policy personas_insert_own
on public.personas
for insert
with check (
  user_id = auth.uid()
  and slug is not null
);

drop policy if exists personas_update_own on public.personas;
create policy personas_update_own
on public.personas
for update
using (
  user_id = auth.uid()
  and deleted_at is null
)
with check (
  user_id = auth.uid()
  and slug is not null
);

create or replace function public.update_persona_with_version(
  p_persona_id uuid,
  p_expected_version integer,
  p_name text,
  p_base_tone text,
  p_relationship_type text,
  p_world_type text,
  p_static_prompt_json jsonb,
  p_slug text default null
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
    slug = coalesce(nullif(p_slug, ''), slug),
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
