# Schema And Environment Pipeline

Amadeus는 local-first desktop runtime과 Supabase cloud sync를 분리한다.
따라서 schema도 같은 파일로 섞지 않고 실행 환경별 소유권을 나눈다.

## Source Of Truth

| Scope | Source | Runtime |
| --- | --- | --- |
| Local SQLite schema | `src-tauri/src/timeline/migrations/local/*.sql` | Tauri desktop |
| Local SQLite migration runner | `src-tauri/src/timeline/core/migrations.rs` | Rust |
| Supabase cloud schema | `supabase/migrations/*.sql` | Supabase remote |
| Edge Function runtime | `supabase/functions/*` | Supabase Edge Functions |
| Historical Drizzle artifact | `drizzle/0000_local_timeline_core.sql` | Not a runtime include |

`TimelineRepository` must not include SQL files directly. It calls the migration module.

## Local SQLite Environments

Rust selects local schema through `AMADEUS_LOCAL_SCHEMA_ENV`.

```text
AMADEUS_LOCAL_SCHEMA_ENV=development
AMADEUS_LOCAL_SCHEMA_ENV=production
```

Current development and production SQLite schema are intentionally identical.
The explicit selector exists so future dev-only seed tables, debug views, or production-only hardening can be added without changing repository code.

Default behavior:

| Build | Default local schema environment |
| --- | --- |
| debug | development |
| release | production |

## Supabase Environments

Supabase projects must be separated by project ref.

```text
dev project     -> disposable test data, manual QA, seed reset allowed
production      -> real user data, no destructive reset
```

Do not infer dev/prod from `NODE_ENV` for Supabase database commands.
Use the linked Supabase project or an explicit project ref in CI.

Recommended manual commands:

```bash
supabase link --project-ref <dev-project-ref>
supabase db push
supabase functions deploy llm-generate
```

```bash
supabase link --project-ref <production-project-ref>
supabase db push
supabase functions deploy llm-generate
```

Production deploy must run after local verification:

```bash
pnpm run typecheck
pnpm build
pnpm exec vitest run
cd src-tauri && cargo test
```

## Persona Seeds

Persona definitions are not owned by Rust prompt code.
Persona card content belongs to the web/Supabase persona source of truth and should be seeded from validated persona card data in a later AI contract phase.

The deferred persona phase must use:

- `docs/pesona/*.md` as reviewed character design references
- structured persona JSON cards as seed artifacts
- Supabase `personas.static_prompt_json` as the cloud source of truth
- local SQLite `local_personas.static_prompt_json` as a cache only

## Rules

- Local private memory stays in SQLite.
- Supabase receives only cloud-safe memory and summaries.
- Rust command modules should not own SQL strings.
- Supabase migrations should not be included by Rust.
- Local SQLite migrations should not be pushed to Supabase.
