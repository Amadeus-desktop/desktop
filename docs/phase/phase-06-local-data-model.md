# Phase 06. Local Data Model

## Goal

MVP local-first DB를 architecture 계약에 맞춰 확장할 준비를 한다.

## Architecture Links

- [Data Model Architecture](../architecture/data-model.md)
- [State Management Architecture](../architecture/state-management.md)

## Scope

- current timeline schema audit
- migration ownership 정리
- local_personas draft schema 준비
- local_memories schema 준비
- work_sessions schema 준비
- sync_queue local schema 준비
- retention fields 설계

## Excluded

- Supabase migration
- actual sync
- OCR summary persistence

## Tests

- existing timeline migration still works
- local private memory cannot be marked syncable
- sync_queue payload requires `SyncPayloadEnvelope`
- OCR summary persistence blocked before retention fields

## Exit Criteria

- local DB extension plan is migration-ready.
- no raw context is syncable by schema.
