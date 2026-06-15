drop policy if exists cloud_memories_select_own on public.cloud_memories;
create policy cloud_memories_select_own
on public.cloud_memories
for select
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.personas
    where personas.id = cloud_memories.persona_id
      and personas.user_id = auth.uid()
      and personas.deleted_at is null
  )
);

drop policy if exists cloud_memories_update_own on public.cloud_memories;
create policy cloud_memories_update_own
on public.cloud_memories
for update
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.personas
    where personas.id = cloud_memories.persona_id
      and personas.user_id = auth.uid()
      and personas.deleted_at is null
  )
)
with check (
  user_id = auth.uid()
  and source <> 'desktop_context'
  and evidence_excerpt_redacted is not null
  and observed_at is not null
  and write_reason <> ''
  and exists (
    select 1
    from public.personas
    where personas.id = cloud_memories.persona_id
      and personas.user_id = auth.uid()
      and personas.deleted_at is null
  )
);

create or replace function public.match_cloud_memories(
  query_embedding extensions.vector(1536),
  match_persona_id uuid,
  match_memory_types text[],
  match_threshold double precision,
  match_count integer,
  match_embedding_model text
)
returns table (
  id uuid,
  persona_id uuid,
  memory_category text,
  memory_type text,
  content text,
  confidence numeric,
  source text,
  safety_grade text,
  normalized_key text,
  source_message_ids uuid[],
  evidence_excerpt_redacted text,
  observed_at timestamptz,
  valid_from timestamptz,
  expires_at timestamptz,
  user_confirmed boolean,
  contradicts_memory_id uuid,
  write_reason text,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz,
  similarity double precision
)
language sql
security invoker
stable
as $$
  select
    cm.id,
    cm.persona_id,
    cm.memory_category,
    cm.memory_type,
    cm.content,
    cm.confidence,
    cm.source,
    cm.safety_grade,
    cm.normalized_key,
    cm.source_message_ids,
    cm.evidence_excerpt_redacted,
    cm.observed_at,
    cm.valid_from,
    cm.expires_at,
    cm.user_confirmed,
    cm.contradicts_memory_id,
    cm.write_reason,
    cm.created_at,
    cm.updated_at,
    cm.deleted_at,
    1 - (cm.embedding OPERATOR(extensions.<=>) query_embedding) as similarity
  from public.cloud_memories cm
  where cm.user_id = auth.uid()
    and cm.persona_id = match_persona_id
    and exists (
      select 1
      from public.personas
      where personas.id = cm.persona_id
        and personas.user_id = auth.uid()
        and personas.deleted_at is null
    )
    and cm.embedding is not null
    and cm.embedding_model = match_embedding_model
    and cm.deleted_at is null
    and (cm.expires_at is null or cm.expires_at >= now())
    and (match_memory_types is null or cm.memory_type = any(match_memory_types))
    and not exists (
      select 1
      from public.cloud_memories newer
      where newer.user_id = auth.uid()
        and newer.contradicts_memory_id = cm.id
        and newer.deleted_at is null
    )
    and 1 - (cm.embedding OPERATOR(extensions.<=>) query_embedding) >= match_threshold
  order by cm.embedding OPERATOR(extensions.<=>) query_embedding
  limit least(greatest(match_count, 0), 24);
$$;
