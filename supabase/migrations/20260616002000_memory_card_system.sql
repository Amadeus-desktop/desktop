create table if not exists public.cloud_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  persona_id uuid not null references public.personas(id) on delete cascade,
  memory_category text not null check (memory_category in ('semantic', 'episodic', 'procedural')),
  memory_type text not null check (
    memory_type in (
      'user_preference',
      'relationship_fact',
      'emotional_pattern',
      'boundary',
      'recurring_work_pattern',
      'episodic_summary',
      'persona_state_hint'
    )
  ),
  content text not null,
  confidence numeric not null check (confidence >= 0 and confidence <= 100),
  source text not null check (source in ('conversation', 'nudge_reaction', 'desktop_context', 'manual')),
  safety_grade text not null check (safety_grade in ('SharedMemory', 'SafeWorkSummary')),
  normalized_key text null,
  source_message_ids uuid[] null,
  evidence_excerpt_redacted text null,
  observed_at timestamptz null,
  valid_from timestamptz null,
  expires_at timestamptz null,
  user_confirmed boolean not null default false,
  contradicts_memory_id uuid null references public.cloud_memories(id),
  write_reason text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  foreign key (persona_id, user_id)
    references public.personas(id, user_id)
);

create index if not exists cloud_memories_prompt_retrieval_idx
  on public.cloud_memories(
    user_id,
    persona_id,
    memory_category,
    confidence desc,
    updated_at desc
  )
  where deleted_at is null;

create unique index if not exists cloud_memories_user_persona_key_idx
  on public.cloud_memories(user_id, persona_id, normalized_key)
  where normalized_key is not null
    and deleted_at is null;

drop trigger if exists cloud_memories_set_updated_at on public.cloud_memories;
create trigger cloud_memories_set_updated_at
before update on public.cloud_memories
for each row execute function public.set_updated_at();

alter table public.cloud_memories enable row level security;

drop policy if exists cloud_memories_select_own on public.cloud_memories;
create policy cloud_memories_select_own
on public.cloud_memories
for select
using (user_id = auth.uid());

drop policy if exists cloud_memories_insert_own on public.cloud_memories;
create policy cloud_memories_insert_own
on public.cloud_memories
for insert
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

drop policy if exists cloud_memories_update_own on public.cloud_memories;
create policy cloud_memories_update_own
on public.cloud_memories
for update
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and source <> 'desktop_context'
  and evidence_excerpt_redacted is not null
  and observed_at is not null
  and write_reason <> ''
);
