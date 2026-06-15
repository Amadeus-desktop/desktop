# Phase 01. Persona Source Of Truth

## Goal

웹과 앱이 같은 persona definition을 사용하게 한다.

Supabase owns persona. App caches persona.

## Supabase Tables

This phase extends the existing `personas` architecture. Existing fields such as `tone`, `personality_json`, and `system_prompt` must either be migrated into this schema or mapped deterministically. They must not remain as a second persona contract.

```text
personas
- id uuid primary key
- user_id uuid references auth.users(id)
- name text not null
- base_tone text not null
- relationship_type text not null
- world_type text not null
- static_prompt_json jsonb not null
- version integer not null
- created_at timestamptz not null
- updated_at timestamptz not null
- deleted_at timestamptz null
```

`static_prompt_json` is the character card. It contains only stable persona rules:

```text
- identity
- backstory
- speech_style
- scenario
- first_message
- example_dialogues[]
- world_lore
- opening_state
- relationship_boundary
- warmth_level
- humor_level
- forbidden_claims
- negative_behavior
- safety_boundary
- privacy_contract
- creator_notes
- creator_visibility
```

Character card rules:

- `first_message` sets the initial scene but is not repeated after the first turn.
- `example_dialogues[]` teach style, not facts, unless explicitly marked as canonical.
- `world_lore` is persona/world context, not user memory.
- `negative_behavior` lists behaviors the persona must avoid.
- `creator_notes` are never shown to the user unless `creator_visibility` allows it.

## Dynamic Persona State

Dynamic relationship state is not part of `static_prompt_json`. It changes through conversation and memory validation.

```text
persona_states
- id uuid primary key
- user_id uuid references auth.users(id)
- persona_id uuid references personas(id)
- relationship_stage text not null
- affinity integer not null -- 0..100
- trust_state text not null -- stable | strained | repair_needed
- recent_mood text null
- open_loops jsonb not null
- last_major_event text null
- boundary_overrides jsonb not null
- state_source text not null -- conversation | explicit_user_edit | system
- version integer not null
- expires_at timestamptz null
- created_at timestamptz not null
- updated_at timestamptz not null
```

Dynamic state must never overwrite static identity. It can only adjust the current relationship stance.

## Local Cache

```text
local_personas
- id text primary key
- remote_persona_id text not null
- name text not null
- base_tone text not null
- relationship_type text not null
- world_type text not null
- static_prompt_json text not null
- persona_state_json text null
- remote_version integer not null
- last_pulled_version integer not null
- pending_mutation_id text null
- sync_status text not null
- updated_at_ms integer not null
```

Local cache is not an independent source of truth.

## Sync Rule

```text
if local.pending_mutation_id is not null:
  keep local cache
  show pending state
  retry or resolve mutation before replacing
else if remote.version > local.remote_version:
  replace local cache
else:
  keep local cache
```

App-side edits must be sent as Supabase mutations. They must not become local-only persona forks.

Mutation rule:

- Every persona update sends `expected_version`.
- Supabase accepts only when `personas.version = expected_version`.
- Accepted updates increment `version`.
- Stale writes return a conflict response with latest persona and state.
- App clears `pending_mutation_id` only after ack for the same mutation id.
- If remote version increases while a local mutation is pending, app enters `conflicted` and requires merge or retry from latest remote.

## Conflict Policy

- Static character card changes are last-writer-wins only after version precondition passes.
- Explicit user edits beat generated suggestions.
- Generated relationship state may expire through `expires_at`.
- Static identity, backstory, and safety boundary cannot be changed by memory extraction.
- Soft delete wins over stale re-upload.

## RLS

For `personas` and `persona_states`:

- `select using (user_id = auth.uid())`
- `insert with check (user_id = auth.uid())`
- `update using (user_id = auth.uid()) with check (user_id = auth.uid())`
- delete should be soft delete through `deleted_at`

`persona_states.persona_id` must belong to the same `user_id`. Cross-user state reads, writes, and joins must fail.

## Scope

- Supabase persona schema.
- Character card schema.
- Dynamic persona state schema.
- RLS policies.
- Persona pull API.
- Local cache update.
- Version conflict rule.

## Excluded

- Conversation sync.
- RAG.
- Memory card extraction.

## Tests

- User cannot read another user's persona.
- User cannot write persona with another `user_id`.
- User cannot read or write another user's `persona_states`.
- App updates local cache when remote version increases.
- App does not overwrite newer local cache with older remote data.
- Stale persona update with old `expected_version` is rejected.
- Pending app mutation does not become a local-only persona fork.
- Dynamic state cannot overwrite static identity.

## Exit Criteria

- Web-created persona appears in app.
- App and web resolve the same `persona_id`.
- Persona cache survives offline app use.
- Character card fields produce the same persona static prompt on web and app.
- Relationship state appears as a separate prompt section.
