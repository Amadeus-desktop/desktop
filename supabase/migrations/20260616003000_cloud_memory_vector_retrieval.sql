create extension if not exists vector with schema extensions;

alter table public.cloud_memories
  add column if not exists embedding extensions.vector(1536),
  add column if not exists embedding_model text,
  add column if not exists embedded_at timestamptz;

create index if not exists cloud_memories_embedding_idx
  on public.cloud_memories
  using ivfflat (embedding extensions.vector_cosine_ops)
  with (lists = 100)
  where embedding is not null
    and deleted_at is null;

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
