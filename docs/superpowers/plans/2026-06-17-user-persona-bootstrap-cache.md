# User Persona Bootstrap Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Current Status

Status: implemented in the current workspace.

Implemented:

- Supabase persona hardening migration exists at `supabase/migrations/20260617010000_persona_bootstrap_hardening.sql`.
- `bootstrap-user-personas` Edge Function exists and contains server-owned default persona templates.
- Tauri local persona cache commands exist: `upsert_local_personas`, `list_local_personas`, `get_local_persona`.
- TypeScript persona bootstrap/cache adapters exist.
- `useCachedPersonas()` is connected to companion shell and settings persona picker.
- Persona cache merge matches by `remotePersonaId` and falls back to stable `slug`.
- Sync queue consume commands exist for pending rows, synced ack, and retryable/non-retryable failure.
- `syncPendingMemorySummaryQueue()` uploads safe memory summaries to Supabase `cloud_memories`.
- App reply memory loading combines cloud-safe memory with local SQLite memory cards.

Latest local verification:

- `pnpm run typecheck`: PASS.
- `cargo test local_persona_cache_can_be_upserted_and_listed`: PASS.
- `cargo test sync_queue_pending_rows_can_be_listed_and_marked`: PASS.
- `cargo test local_memory_cards_can_be_listed_for_prompt_context`: PASS.
- Focused Vitest command did not produce output for about 90 seconds and was interrupted, so Vitest pass is not confirmed.

The unchecked task list below is the original implementation checklist, not an authoritative current progress tracker.

**Goal:** Create user-owned default personas from the three bundled character cards, cache pulled personas in SQLite, and make the app consume cached personas instead of only hardcoded i18n registry data.

**Architecture:** Supabase remains the persona source of truth. A server-side bootstrap function creates missing default personas for the authenticated user, the app pulls those rows, and Tauri stores them in SQLite `local_personas`. React reads cached personas with a bundled-card fallback for offline/unauthenticated preview.

**Tech Stack:** Supabase SQL migrations, Supabase Edge Functions on Deno, `@supabase/supabase-js`, Tauri v2 commands, Rust `rusqlite`, TypeScript/Vitest, React.

---

## Scope Boundary

This plan implements the persona foundation only. It does not implement memory sync worker or full RAG source selection; those are separate subsystems and should get their own plan after this one lands.

## File Structure

- Create: `supabase/migrations/20260617010000_persona_bootstrap_hardening.sql`
  - Adds deterministic current persona state support and hardens conversation persona ownership on update.
- Create: `supabase/functions/bootstrap-user-personas/index.ts`
  - Authenticated, idempotent server-side bootstrap for the three default character cards.
- Modify: `src-tauri/src/timeline/core/contract.rs`
  - Adds local persona cache input/output structs.
- Modify: `src-tauri/src/timeline/core/repository.rs`
  - Adds `upsert_local_personas`, `list_local_personas`, and `get_local_persona`.
- Modify: `src-tauri/src/timeline/commands/mod.rs`
  - Exposes Tauri commands for local persona cache.
- Modify: `src-tauri/src/timeline/mod.rs`
  - Re-exports new contract types if needed.
- Modify: `src-tauri/src/lib.rs`
  - Registers new Tauri commands if command registration is explicit there.
- Modify: `src/features/timeline/types.ts`
  - Adds `LocalPersonaCache` command types matching Rust.
- Modify: `src/features/timeline/adapters/timelineRepository.ts`
  - Adds frontend wrappers for persona cache commands and mock fallback.
- Create: `src/features/persona/adapters/bootstrapUserPersonas.ts`
  - Invokes the Supabase Edge Function.
- Create: `src/features/persona/adapters/personaCacheRepository.ts`
  - Coordinates pull, merge, and SQLite upsert.
- Modify: `src/features/persona/index.ts`
  - Exports the bootstrap/cache service.
- Create: `src/features/persona/hooks/useCachedPersonas.ts`
  - React hook that loads cached personas and falls back to bundled cards.
- Modify: `src/features/companion/hooks/useCompanionShell.ts`
  - Uses cached personas for shell state.
- Modify: `src/features/settings/components/CompanionPersonaPicker.tsx`
  - Uses cached personas for settings options.
- Test: `src/domain/persona/sourceOfTruth.test.ts`
  - Add slug/remote id cache expectations if missing.
- Test: `src/features/persona/adapters/personaCacheRepository.test.ts`
  - Verifies bootstrap/pull/cache merge behavior.
- Test: `src-tauri/src/timeline/tests/mod.rs`
  - Verifies SQLite local persona cache commands.

## Task 1: Supabase Persona State And RLS Hardening

**Files:**
- Create: `supabase/migrations/20260617010000_persona_bootstrap_hardening.sql`

- [ ] **Step 1: Add migration**

Create `supabase/migrations/20260617010000_persona_bootstrap_hardening.sql`:

```sql
alter table public.persona_states
  add column if not exists is_current boolean not null default true;

do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'persona_states_one_current_idx'
  ) then
    create unique index persona_states_one_current_idx
      on public.persona_states(user_id, persona_id)
      where is_current = true;
  end if;
end;
$$;

drop policy if exists persona_states_select_own on public.persona_states;
create policy persona_states_select_own
on public.persona_states
for select
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.personas
    where personas.id = persona_states.persona_id
      and personas.user_id = auth.uid()
      and personas.deleted_at is null
  )
);

drop policy if exists cloud_conversations_update_own on public.cloud_conversations;
create policy cloud_conversations_update_own on public.cloud_conversations
for update
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.personas
    where personas.id = cloud_conversations.persona_id
      and personas.user_id = auth.uid()
      and personas.deleted_at is null
  )
);
```

- [ ] **Step 2: Review migration for syntax**

Run:

```bash
rg -n "persona_states_one_current_idx|cloud_conversations_update_own" supabase/migrations/20260617010000_persona_bootstrap_hardening.sql
```

Expected: both symbols appear.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260617010000_persona_bootstrap_hardening.sql
git commit -m "feat: harden persona state and conversation rls"
```

## Task 2: Supabase Bootstrap Edge Function

**Files:**
- Create: `supabase/functions/bootstrap-user-personas/index.ts`

- [ ] **Step 1: Create function with server-owned default card templates**

Create `supabase/functions/bootstrap-user-personas/index.ts`:

```ts
type DefaultPersonaCard = {
  slug: string;
  name: string;
  baseTone: string;
  relationshipType: string;
  worldType: string;
  version: number;
  staticPromptJson: Record<string, unknown>;
  personaStateSeed: {
    relationship_stage: string;
    affinity: number;
    trust_state: string;
    recent_mood?: string | null;
    open_loops: unknown[];
    last_major_event?: string | null;
    boundary_overrides: Record<string, unknown>;
    state_source: string;
    version: number;
    expires_at?: string | null;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_PERSONAS: DefaultPersonaCard[] = [
  {
    slug: "seoyeon-modern-senior",
    name: "한서연",
    baseTone: "restrained_warm",
    relationshipType: "ex_lover_senior",
    worldType: "modern_romance",
    version: 2,
    staticPromptJson: {
      identity: { name: "한서연" },
      first_message: "헤어진 사람한테 이런 말 하는 거 웃긴데, 늦은 시간이네. 물 한 모금 마실래?",
      privacy_contract: { desktop_context: "화면 원문을 인용하지 않는다." },
    },
    personaStateSeed: {
      relationship_stage: "unresolved_reunion",
      affinity: 34,
      trust_state: "strained",
      recent_mood: "quietly_regretful",
      open_loops: ["서연은 예전에 사용자가 무리하던 습관을 기억한다."],
      last_major_event: "rainy_late_work_reunion",
      boundary_overrides: { romance_intensity: "low_until_user_opens" },
      state_source: "system",
      version: 1,
    },
  },
  {
    slug: "eiren-fantasy-guardian",
    name: "에이렌",
    baseTone: "restrained_devoted",
    relationshipType: "cursed_sworn_guardian",
    worldType: "romantic_fantasy",
    version: 2,
    staticPromptJson: {
      identity: { name: "에이렌" },
      first_message: "그 표식... 내 마지막 맹세가 너를 알아본 모양이군. 겁먹지 마라. 네 허락 없이 가까이 가지 않겠다.",
      privacy_contract: { desktop_context: "화면 원문을 직접 언급하지 않는다." },
    },
    personaStateSeed: {
      relationship_stage: "oath_recognized",
      affinity: 31,
      trust_state: "stable",
      recent_mood: "restrained_devotion",
      open_loops: ["사용자의 손목에는 에이렌의 맹세와 연결된 은빛 표식이 있다."],
      last_major_event: "oath_mark_awakening",
      boundary_overrides: { world_strength: "low_until_deep" },
      state_source: "system",
      version: 1,
    },
  },
  {
    slug: "makise-kurisu",
    name: "마키세 크리스",
    baseTone: "logical_tsundere",
    relationshipType: "lab_partner",
    worldType: "sci_fi_modern",
    version: 2,
    staticPromptJson: {
      identity: { name: "마키세 크리스" },
      first_message: "아직도 붙잡고 있어? 하아... 그 결론은 너무 성급해. 그래도 네가 막힌 건 사실이니까, 변수부터 줄이자.",
      privacy_contract: { desktop_context: "화면 내용을 직접 인용하지 않는다." },
    },
    personaStateSeed: {
      relationship_stage: "argumentative_lab_partner",
      affinity: 26,
      trust_state: "stable",
      recent_mood: "analytical_but_concerned",
      open_loops: ["크리스는 사용자의 성급한 자기비난을 논리적으로 반박한다."],
      last_major_event: "late_lab_argument",
      boundary_overrides: {},
      state_source: "system",
      version: 1,
    },
  },
];

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "missing_authorization" }, 401);
  }

  const userId = await verifySupabaseJwt(authHeader);
  if (!userId) {
    return jsonResponse({ error: "invalid_authorization" }, 401);
  }

  try {
    const personas = await ensureDefaultPersonas(userId, authHeader);
    return jsonResponse({ personas });
  } catch (error) {
    return jsonResponse({ error: errorMessage(error) }, 500);
  }
});

async function ensureDefaultPersonas(userId: string, authHeader: string) {
  const existing = await fetchExistingPersonas(authHeader);
  const existingSlugs = new Set(existing.map((row) => row.slug));

  for (const card of DEFAULT_PERSONAS) {
    if (existingSlugs.has(card.slug)) continue;
    const persona = await insertPersona(userId, authHeader, card);
    await insertPersonaState(userId, authHeader, persona.id, card);
  }

  return fetchExistingPersonas(authHeader);
}

async function fetchExistingPersonas(authHeader: string): Promise<Array<{ id: string; slug: string }>> {
  const url = new URL(`${requiredSupabaseUrl()}/rest/v1/personas`);
  url.searchParams.set("select", "id,slug");
  url.searchParams.set("deleted_at", "is.null");
  const response = await fetch(url, {
    headers: { apikey: requiredSupabaseAnonKey(), authorization: authHeader },
  });
  if (!response.ok) throw new Error(`persona_fetch_failed_${response.status}`);
  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
}

async function insertPersona(userId: string, authHeader: string, card: DefaultPersonaCard): Promise<{ id: string }> {
  const response = await fetch(`${requiredSupabaseUrl()}/rest/v1/personas`, {
    method: "POST",
    headers: {
      apikey: requiredSupabaseAnonKey(),
      authorization: authHeader,
      "content-type": "application/json",
      prefer: "return=representation",
    },
    body: JSON.stringify({
      user_id: userId,
      slug: card.slug,
      name: card.name,
      base_tone: card.baseTone,
      relationship_type: card.relationshipType,
      world_type: card.worldType,
      static_prompt_json: card.staticPromptJson,
      version: card.version,
    }),
  });
  if (!response.ok) throw new Error(`persona_insert_failed_${response.status}`);
  const rows = await response.json();
  const id = Array.isArray(rows) ? rows[0]?.id : null;
  if (typeof id !== "string") throw new Error("persona_insert_missing_id");
  return { id };
}

async function insertPersonaState(
  userId: string,
  authHeader: string,
  personaId: string,
  card: DefaultPersonaCard,
) {
  const seed = card.personaStateSeed;
  const response = await fetch(`${requiredSupabaseUrl()}/rest/v1/persona_states`, {
    method: "POST",
    headers: {
      apikey: requiredSupabaseAnonKey(),
      authorization: authHeader,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      user_id: userId,
      persona_id: personaId,
      relationship_stage: seed.relationship_stage,
      affinity: seed.affinity,
      trust_state: seed.trust_state,
      recent_mood: seed.recent_mood ?? null,
      open_loops: seed.open_loops,
      last_major_event: seed.last_major_event ?? null,
      boundary_overrides: seed.boundary_overrides,
      state_source: seed.state_source,
      version: seed.version,
      expires_at: seed.expires_at ?? null,
      is_current: true,
    }),
  });
  if (!response.ok) throw new Error(`persona_state_insert_failed_${response.status}`);
}

async function verifySupabaseJwt(authHeader: string): Promise<string | null> {
  const response = await fetch(`${requiredSupabaseUrl()}/auth/v1/user`, {
    headers: { apikey: requiredSupabaseAnonKey(), authorization: authHeader },
  });
  if (!response.ok) return null;
  const user = await response.json();
  return typeof user?.id === "string" ? user.id : null;
}

function requiredSupabaseUrl(): string {
  return Deno.env.get("SUPABASE_URL") || Deno.env.get("PUBLIC_SUPABASE_URL") || requiredEnv("SUPABASE_URL");
}

function requiredSupabaseAnonKey(): string {
  return Deno.env.get("SUPABASE_ANON_KEY") ||
    Deno.env.get("PUBLIC_SUPABASE_ANON_KEY") ||
    Deno.env.get("PUBLIC_SUPABASE_PUBLISHABLE_KEY") ||
    requiredEnv("SUPABASE_ANON_KEY");
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name.toLowerCase()}_missing`);
  return value;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown_error";
}
```

- [ ] **Step 2: Replace minimal templates with full card data**

Copy the full `staticPromptJson` and `personaStateSeed` values from:

```text
src/domain/persona/cards/seoyeon-modern-senior.json
src/domain/persona/cards/eiren-fantasy-guardian.json
src/domain/persona/cards/makise-kurisu.json
```

Do not import local app files from the Edge Function. Paste or generate server-owned JSON in the function file so deployed Supabase code has no Vite/runtime dependency.

- [ ] **Step 3: Verify function text compiles structurally**

Run:

```bash
rg -n "Deno.serve|bootstrap-user-personas|DEFAULT_PERSONAS|ensureDefaultPersonas" supabase/functions/bootstrap-user-personas/index.ts
```

Expected: all terms appear.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/bootstrap-user-personas/index.ts
git commit -m "feat: add user persona bootstrap function"
```

## Task 3: Rust Local Persona Cache Commands

**Files:**
- Modify: `src-tauri/src/timeline/core/contract.rs`
- Modify: `src-tauri/src/timeline/core/repository.rs`
- Modify: `src-tauri/src/timeline/commands/mod.rs`
- Modify: `src-tauri/src/timeline/mod.rs`
- Modify: `src-tauri/src/lib.rs`
- Test: `src-tauri/src/timeline/tests/mod.rs`

- [ ] **Step 1: Add failing Rust test**

Append to `src-tauri/src/timeline/tests/mod.rs`:

```rust
#[test]
fn local_persona_cache_can_be_upserted_and_listed() {
    let mut repository = TimelineRepository::open_in_memory().expect("repo opens");
    repository.migrate().expect("migration succeeds");

    let cache = LocalPersonaCacheInput {
        id: "remote-persona-1".to_string(),
        remote_persona_id: "remote-persona-1".to_string(),
        slug: "makise-kurisu".to_string(),
        name: "마키세 크리스".to_string(),
        base_tone: "logical_tsundere".to_string(),
        relationship_type: "lab_partner".to_string(),
        world_type: "sci_fi_modern".to_string(),
        static_prompt_json: "{\"identity\":{\"name\":\"마키세 크리스\"}}".to_string(),
        persona_state_json: Some("{\"relationship_stage\":\"argumentative_lab_partner\"}".to_string()),
        remote_version: 2,
        last_pulled_version: 2,
        pending_mutation_id: None,
        sync_status: "synced".to_string(),
        updated_at_ms: 1_797_398_400_000,
    };

    repository
        .upsert_local_personas(vec![cache])
        .expect("upsert succeeds");

    let personas = repository
        .list_local_personas()
        .expect("list succeeds");

    assert_eq!(personas.len(), 1);
    assert_eq!(personas[0].slug, "makise-kurisu");
    assert_eq!(personas[0].remote_persona_id, "remote-persona-1");

    let found = repository
        .get_local_persona("makise-kurisu".to_string())
        .expect("get succeeds")
        .expect("persona exists");
    assert_eq!(found.name, "마키세 크리스");
}
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
cargo test local_persona_cache_can_be_upserted_and_listed
```

from `src-tauri`.

Original expected result while following this plan from an empty implementation: FAIL because `LocalPersonaCacheInput` and the repository methods were absent at that point. In the current workspace these APIs exist, so this step is historical TDD context.

- [ ] **Step 3: Add contract structs**

Add to `src-tauri/src/timeline/core/contract.rs`:

```rust
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalPersonaCacheInput {
    pub id: String,
    pub remote_persona_id: String,
    pub slug: String,
    pub name: String,
    pub base_tone: String,
    pub relationship_type: String,
    pub world_type: String,
    pub static_prompt_json: String,
    pub persona_state_json: Option<String>,
    pub remote_version: i64,
    pub last_pulled_version: i64,
    pub pending_mutation_id: Option<String>,
    pub sync_status: String,
    pub updated_at_ms: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpsertLocalPersonasInput {
    pub personas: Vec<LocalPersonaCacheInput>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetLocalPersonaInput {
    pub slug_or_remote_id: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalPersonaCacheRow {
    pub id: String,
    pub remote_persona_id: String,
    pub slug: String,
    pub name: String,
    pub base_tone: String,
    pub relationship_type: String,
    pub world_type: String,
    pub static_prompt_json: String,
    pub persona_state_json: Option<String>,
    pub remote_version: i64,
    pub last_pulled_version: i64,
    pub pending_mutation_id: Option<String>,
    pub sync_status: String,
    pub updated_at_ms: i64,
}
```

- [ ] **Step 4: Add repository methods**

Add imports and methods in `src-tauri/src/timeline/core/repository.rs`:

```rust
use super::{GetLocalPersonaInput, LocalPersonaCacheInput, LocalPersonaCacheRow, UpsertLocalPersonasInput};
```

Add inside `impl TimelineRepository`:

```rust
pub fn upsert_local_personas(
    &mut self,
    input: UpsertLocalPersonasInput,
) -> Result<Vec<LocalPersonaCacheRow>, TimelineError> {
    for persona in input.personas {
        self.upsert_local_persona_row(persona)?;
    }
    self.list_local_personas()
}

fn upsert_local_persona_row(
    &mut self,
    persona: LocalPersonaCacheInput,
) -> Result<(), TimelineError> {
    if persona.slug.trim().is_empty() {
        return Err(TimelineError::Validation("persona slug is required".to_string()));
    }
    if persona.remote_persona_id.trim().is_empty() {
        return Err(TimelineError::Validation("remote_persona_id is required".to_string()));
    }
    self.connection.execute(
        "INSERT INTO local_personas (
            id,
            remote_persona_id,
            slug,
            name,
            base_tone,
            relationship_type,
            world_type,
            static_prompt_json,
            persona_state_json,
            remote_version,
            last_pulled_version,
            pending_mutation_id,
            sync_status,
            updated_at_ms
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
        ON CONFLICT(id) DO UPDATE SET
            remote_persona_id = excluded.remote_persona_id,
            slug = excluded.slug,
            name = excluded.name,
            base_tone = excluded.base_tone,
            relationship_type = excluded.relationship_type,
            world_type = excluded.world_type,
            static_prompt_json = excluded.static_prompt_json,
            persona_state_json = excluded.persona_state_json,
            remote_version = excluded.remote_version,
            last_pulled_version = excluded.last_pulled_version,
            pending_mutation_id = excluded.pending_mutation_id,
            sync_status = excluded.sync_status,
            updated_at_ms = excluded.updated_at_ms",
        params![
            persona.id,
            persona.remote_persona_id,
            persona.slug,
            persona.name,
            persona.base_tone,
            persona.relationship_type,
            persona.world_type,
            persona.static_prompt_json,
            persona.persona_state_json,
            persona.remote_version,
            persona.last_pulled_version,
            persona.pending_mutation_id,
            persona.sync_status,
            persona.updated_at_ms
        ],
    )?;
    Ok(())
}

pub fn list_local_personas(&self) -> Result<Vec<LocalPersonaCacheRow>, TimelineError> {
    let mut statement = self.connection.prepare(
        "SELECT id, remote_persona_id, slug, name, base_tone, relationship_type, world_type,
                static_prompt_json, persona_state_json, remote_version, last_pulled_version,
                pending_mutation_id, sync_status, updated_at_ms
         FROM local_personas
         WHERE sync_status <> 'deleted'
         ORDER BY updated_at_ms DESC, name ASC",
    )?;
    let rows = statement.query_map([], local_persona_from_row)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(TimelineError::from)
}

pub fn get_local_persona(
    &self,
    input: GetLocalPersonaInput,
) -> Result<Option<LocalPersonaCacheRow>, TimelineError> {
    self.connection
        .query_row(
            "SELECT id, remote_persona_id, slug, name, base_tone, relationship_type, world_type,
                    static_prompt_json, persona_state_json, remote_version, last_pulled_version,
                    pending_mutation_id, sync_status, updated_at_ms
             FROM local_personas
             WHERE slug = ?1 OR remote_persona_id = ?1
             LIMIT 1",
            params![input.slug_or_remote_id],
            local_persona_from_row,
        )
        .optional()
        .map_err(TimelineError::from)
}
```

Add near helper functions:

```rust
fn local_persona_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<LocalPersonaCacheRow> {
    Ok(LocalPersonaCacheRow {
        id: row.get(0)?,
        remote_persona_id: row.get(1)?,
        slug: row.get(2)?,
        name: row.get(3)?,
        base_tone: row.get(4)?,
        relationship_type: row.get(5)?,
        world_type: row.get(6)?,
        static_prompt_json: row.get(7)?,
        persona_state_json: row.get(8)?,
        remote_version: row.get(9)?,
        last_pulled_version: row.get(10)?,
        pending_mutation_id: row.get(11)?,
        sync_status: row.get(12)?,
        updated_at_ms: row.get(13)?,
    })
}
```

- [ ] **Step 5: Add commands**

Add to `src-tauri/src/timeline/commands/mod.rs` imports:

```rust
GetLocalPersonaInput, LocalPersonaCacheRow, UpsertLocalPersonasInput,
```

Add commands:

```rust
#[tauri::command]
pub fn upsert_local_personas(
    state: State<'_, TimelineState>,
    input: UpsertLocalPersonasInput,
) -> Result<Vec<LocalPersonaCacheRow>, CommandError> {
    with_repository(&state, |repository| repository.upsert_local_personas(input))
}

#[tauri::command]
pub fn list_local_personas(
    state: State<'_, TimelineState>,
) -> Result<Vec<LocalPersonaCacheRow>, CommandError> {
    with_repository(&state, |repository| repository.list_local_personas())
}

#[tauri::command]
pub fn get_local_persona(
    state: State<'_, TimelineState>,
    input: GetLocalPersonaInput,
) -> Result<Option<LocalPersonaCacheRow>, CommandError> {
    with_repository(&state, |repository| repository.get_local_persona(input))
}
```

- [ ] **Step 6: Register commands**

Find `tauri::generate_handler!` in `src-tauri/src/lib.rs`. Add:

```rust
timeline::commands::upsert_local_personas,
timeline::commands::list_local_personas,
timeline::commands::get_local_persona,
```

- [ ] **Step 7: Run Rust test**

Run from `src-tauri`:

```bash
cargo test local_persona_cache_can_be_upserted_and_listed
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src-tauri/src/timeline/core/contract.rs src-tauri/src/timeline/core/repository.rs src-tauri/src/timeline/commands/mod.rs src-tauri/src/timeline/mod.rs src-tauri/src/lib.rs src-tauri/src/timeline/tests/mod.rs
git commit -m "feat: add local persona cache commands"
```

## Task 4: TypeScript Persona Cache Service

**Files:**
- Modify: `src/features/timeline/types.ts`
- Modify: `src/features/timeline/adapters/timelineRepository.ts`
- Create: `src/features/persona/adapters/bootstrapUserPersonas.ts`
- Create: `src/features/persona/adapters/personaCacheRepository.ts`
- Modify: `src/features/persona/index.ts`
- Test: `src/features/persona/adapters/personaCacheRepository.test.ts`

- [ ] **Step 1: Add failing TypeScript test**

Create `src/features/persona/adapters/personaCacheRepository.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import type { CloudPersonaSnapshot, LocalPersonaCache } from "../../../domain/persona";
import { syncCloudPersonasToLocalCache } from "./personaCacheRepository";

const remote: CloudPersonaSnapshot = {
  remotePersonaId: "remote-1",
  slug: "makise-kurisu",
  name: "마키세 크리스",
  baseTone: "logical_tsundere",
  relationshipType: "lab_partner",
  worldType: "sci_fi_modern",
  staticPromptJson: { identity: { name: "마키세 크리스" } },
  personaStateJson: {
    relationship_stage: "argumentative_lab_partner",
    affinity: 26,
    trust_state: "stable",
    recent_mood: null,
    open_loops: [],
    last_major_event: null,
    boundary_overrides: {},
    state_source: "system",
    version: 1,
  },
  version: 2,
  updatedAtMs: 1_797_398_400_000,
  deletedAt: null,
};

describe("syncCloudPersonasToLocalCache", () => {
  it("bootstraps, pulls, merges, and writes local persona cache", async () => {
    const bootstrapUserPersonas = vi.fn().mockResolvedValue(undefined);
    const pullCloudPersonas = vi.fn().mockResolvedValue([remote]);
    const listLocalPersonas = vi.fn().mockResolvedValue([]);
    const upsertLocalPersonas = vi.fn().mockImplementation(async (personas: LocalPersonaCache[]) => personas);

    const result = await syncCloudPersonasToLocalCache({
      bootstrapUserPersonas,
      pullCloudPersonas,
      listLocalPersonas,
      upsertLocalPersonas,
    });

    expect(bootstrapUserPersonas).toHaveBeenCalledOnce();
    expect(pullCloudPersonas).toHaveBeenCalledOnce();
    expect(upsertLocalPersonas).toHaveBeenCalledWith([
      expect.objectContaining({
        remotePersonaId: "remote-1",
        slug: "makise-kurisu",
        name: "마키세 크리스",
        syncStatus: "synced",
      }),
    ]);
    expect(result).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
pnpm exec vitest run src/features/persona/adapters/personaCacheRepository.test.ts --reporter=verbose
```

Original expected result while following this plan from an empty implementation: FAIL because `personaCacheRepository` was absent at that point. In the current workspace this adapter exists, so this step is historical TDD context.

- [ ] **Step 3: Add timeline types and wrappers**

Add to `src/features/timeline/types.ts`:

```ts
export type LocalPersonaCacheRow = {
  id: string;
  remotePersonaId: string;
  slug: string;
  name: string;
  baseTone: string;
  relationshipType: string;
  worldType: string;
  staticPromptJson: string;
  personaStateJson: string | null;
  remoteVersion: number;
  lastPulledVersion: number;
  pendingMutationId: string | null;
  syncStatus: "synced" | "pending" | "conflicted" | "deleted";
  updatedAtMs: number;
};

export type UpsertLocalPersonasInput = {
  personas: LocalPersonaCacheRow[];
};

export type GetLocalPersonaInput = {
  slugOrRemoteId: string;
};
```

Add to `src/features/timeline/adapters/timelineRepository.ts`:

```ts
import type { GetLocalPersonaInput, LocalPersonaCacheRow, UpsertLocalPersonasInput } from "../types";

export async function upsertLocalPersonas(
  personas: LocalPersonaCacheRow[],
): Promise<LocalPersonaCacheRow[]> {
  if (isTauriRuntime()) {
    return invoke<LocalPersonaCacheRow[]>("upsert_local_personas", {
      input: { personas } satisfies UpsertLocalPersonasInput,
    });
  }
  return personas;
}

export async function listLocalPersonas(): Promise<LocalPersonaCacheRow[]> {
  if (isTauriRuntime()) {
    return invoke<LocalPersonaCacheRow[]>("list_local_personas");
  }
  return [];
}

export async function getLocalPersona(
  slugOrRemoteId: string,
): Promise<LocalPersonaCacheRow | null> {
  if (isTauriRuntime()) {
    return invoke<LocalPersonaCacheRow | null>("get_local_persona", {
      input: { slugOrRemoteId } satisfies GetLocalPersonaInput,
    });
  }
  return null;
}
```

- [ ] **Step 4: Add bootstrap adapter**

Create `src/features/persona/adapters/bootstrapUserPersonas.ts`:

```ts
import { getSupabaseClient } from "../../../lib/supabase/client";

const BOOTSTRAP_USER_PERSONAS_FUNCTION = "bootstrap-user-personas";

export async function bootstrapUserPersonas(): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.functions.invoke(
    BOOTSTRAP_USER_PERSONAS_FUNCTION,
    { body: {} },
  );
  if (error) {
    throw error;
  }
}
```

- [ ] **Step 5: Add cache repository**

Create `src/features/persona/adapters/personaCacheRepository.ts`:

```ts
import {
  buildLocalPersonaCache,
  mergeRemotePersonaCache,
  type CloudPersonaSnapshot,
  type LocalPersonaCache,
} from "../../../domain/persona";
import {
  listLocalPersonas as defaultListLocalPersonas,
  upsertLocalPersonas as defaultUpsertLocalPersonas,
} from "../../timeline/adapters/timelineRepository";
import { bootstrapUserPersonas as defaultBootstrapUserPersonas } from "./bootstrapUserPersonas";
import { pullCloudPersonas as defaultPullCloudPersonas } from "./supabasePersonaRepository";

type Dependencies = {
  bootstrapUserPersonas: () => Promise<void>;
  pullCloudPersonas: () => Promise<CloudPersonaSnapshot[]>;
  listLocalPersonas: () => Promise<LocalPersonaCache[]>;
  upsertLocalPersonas: (personas: LocalPersonaCache[]) => Promise<LocalPersonaCache[]>;
};

export async function syncCloudPersonasToLocalCache(
  dependencies: Dependencies = {
    bootstrapUserPersonas: defaultBootstrapUserPersonas,
    pullCloudPersonas: defaultPullCloudPersonas,
    listLocalPersonas: defaultListLocalPersonas,
    upsertLocalPersonas: defaultUpsertLocalPersonas,
  },
): Promise<LocalPersonaCache[]> {
  await dependencies.bootstrapUserPersonas();
  const [remotePersonas, localPersonas] = await Promise.all([
    dependencies.pullCloudPersonas(),
    dependencies.listLocalPersonas(),
  ]);
  const localByRemoteId = new Map(
    localPersonas.map((persona) => [persona.remotePersonaId, persona]),
  );
  const nextCaches = remotePersonas.flatMap((remote) => {
    const decision = mergeRemotePersonaCache(
      localByRemoteId.get(remote.remotePersonaId) ?? null,
      remote,
    );
    return decision.action === "keep" ? [] : [decision.cache];
  });

  if (nextCaches.length === 0) {
    return localPersonas;
  }

  return dependencies.upsertLocalPersonas(nextCaches);
}

export function buildFallbackLocalPersonaCache(
  remote: CloudPersonaSnapshot,
): LocalPersonaCache {
  return buildLocalPersonaCache(remote);
}
```

- [ ] **Step 6: Export service**

Modify `src/features/persona/index.ts`:

```ts
export { bootstrapUserPersonas } from "./adapters/bootstrapUserPersonas";
export {
  buildFallbackLocalPersonaCache,
  syncCloudPersonasToLocalCache,
} from "./adapters/personaCacheRepository";
```

- [ ] **Step 7: Run TypeScript test**

Run:

```bash
pnpm exec vitest run src/features/persona/adapters/personaCacheRepository.test.ts --reporter=verbose
```

Expected: PASS.

- [ ] **Step 8: Run typecheck**

Run:

```bash
pnpm run typecheck
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/features/timeline/types.ts src/features/timeline/adapters/timelineRepository.ts src/features/persona/adapters/bootstrapUserPersonas.ts src/features/persona/adapters/personaCacheRepository.ts src/features/persona/adapters/personaCacheRepository.test.ts src/features/persona/index.ts
git commit -m "feat: sync cloud personas into local cache"
```

## Task 5: React Cached Persona Hook And UI Connection

**Files:**
- Create: `src/features/persona/hooks/useCachedPersonas.ts`
- Modify: `src/features/companion/hooks/useCompanionShell.ts`
- Modify: `src/features/settings/components/CompanionPersonaPicker.tsx`

- [ ] **Step 1: Create cached personas hook**

Create `src/features/persona/hooks/useCachedPersonas.ts`:

```ts
import { useEffect, useMemo, useState } from "react";
import type { AppLocale } from "../../../i18n/types";
import { getPersonaList, type Persona } from "../../../domain/persona";
import type { LocalPersonaCache } from "../../../domain/persona";
import {
  listLocalPersonas,
} from "../../timeline/adapters/timelineRepository";
import { syncCloudPersonasToLocalCache } from "../adapters/personaCacheRepository";

type CachedPersonaState = {
  personas: Persona[];
  loading: boolean;
  error: string | null;
};

export function useCachedPersonas(locale: AppLocale): CachedPersonaState {
  const fallbackPersonas = useMemo(() => getPersonaList(locale), [locale]);
  const [cachedPersonas, setCachedPersonas] = useState<Persona[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const synced = await syncCloudPersonasToLocalCache();
        const source = synced.length ? synced : await listLocalPersonas();
        if (!cancelled && source.length) {
          setCachedPersonas(source.map(localCacheToPersona));
        }
      } catch (loadError) {
        try {
          const local = await listLocalPersonas();
          if (!cancelled && local.length) {
            setCachedPersonas(local.map(localCacheToPersona));
          }
        } catch {
          if (!cancelled) {
            setError(loadError instanceof Error ? loadError.message : "persona_load_failed");
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  return {
    personas: cachedPersonas ?? fallbackPersonas,
    loading,
    error,
  };
}

function localCacheToPersona(cache: LocalPersonaCache): Persona {
  return {
    id: cache.slug as Persona["id"],
    name: cache.name,
    shortLabel: cache.relationshipType,
    description: cache.worldType,
    icon: cache.slug === "eiren-fantasy-guardian"
      ? "star"
      : cache.slug === "makise-kurisu"
        ? "line"
        : "letter",
  };
}
```

- [ ] **Step 2: Connect companion shell**

Modify `src/features/companion/hooks/useCompanionShell.ts`:

Replace:

```ts
const matesById = useMemo(() => getCompanionMates(locale), [locale]);
const mateList = useMemo(() => getCompanionMateList(locale), [locale]);
```

with:

```ts
const cachedPersonas = useCachedPersonas(locale);
const mateList = cachedPersonas.personas;
const matesById = useMemo(
  () =>
    mateList.reduce(
      (personas, persona) => {
        personas[persona.id] = persona;
        return personas;
      },
      {} as Record<CompanionMateId, Persona>,
    ),
  [mateList],
);
```

Add imports:

```ts
import { useCachedPersonas } from "../../persona/hooks/useCachedPersonas";
import type { Persona } from "../../../domain/persona";
```

Keep `normalizeCompanionMateId` for settings compatibility.

- [ ] **Step 3: Connect settings picker**

Modify `src/features/settings/components/CompanionPersonaPicker.tsx`:

Replace:

```ts
const personas = getPersonaList(t);
```

with:

```ts
const { personas } = useCachedPersonas(t);
```

Add import:

```ts
import { useCachedPersonas } from "../../persona/hooks/useCachedPersonas";
```

Remove the direct `getPersonaList` import if unused.

- [ ] **Step 4: Run typecheck**

Run:

```bash
pnpm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/persona/hooks/useCachedPersonas.ts src/features/companion/hooks/useCompanionShell.ts src/features/settings/components/CompanionPersonaPicker.tsx
git commit -m "feat: use cached personas in app UI"
```

## Task 6: Verification

**Files:**
- No new files.

- [ ] **Step 1: Run focused TypeScript checks**

Run:

```bash
pnpm run typecheck
```

Expected: PASS.

- [ ] **Step 2: Run focused Vitest tests**

Run:

```bash
pnpm exec vitest run src/domain/persona/sourceOfTruth.test.ts src/features/persona/adapters/personaCacheRepository.test.ts --reporter=verbose
```

Expected: PASS. If Vitest hangs as previously observed, record the hang with command and duration instead of claiming pass.

- [ ] **Step 3: Run Rust focused tests**

Run from `src-tauri`:

```bash
cargo test local_persona_cache_can_be_upserted_and_listed
```

Expected: PASS.

- [ ] **Step 4: Check final diff**

Run:

```bash
git status --short
git diff --stat
```

Expected: only intended uncommitted files remain. Existing unrelated user changes may still be present and must not be reverted.

## Self-Review Notes

- Spec coverage: this plan covers user-owned default persona bootstrap, persona current-state hardening, SQLite local persona cache, app pull/cache, and UI connection.
- Memory sync worker status: app-side safe summary queue consumption is implemented for `memory.summary` rows.
- RAG source selection status: app replies can combine Supabase cloud-safe memory and SQLite local memory cards. Web-specific orchestration remains a future web surface task.
- Verification status: typecheck and focused Rust tests pass; focused Vitest did not complete during the latest local check.
- Placeholder scan: no TBD/TODO placeholders remain in the plan text.
- Type consistency: `slug`, `remotePersonaId`, and SQLite camelCase fields match the existing TypeScript `LocalPersonaCache` contract; Rust serde uses `rename_all = "camelCase"` for command boundaries.
