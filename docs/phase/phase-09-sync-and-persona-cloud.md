# Phase 09. Sync And Persona Cloud

## Goal

Desktop app과 Supabase를 안전하게 연결한다.

## Architecture Links

- [Sync And Web Architecture](../architecture/sync-and-web.md)
- [Data Model Architecture](../architecture/data-model.md)
- [Policy And Security Architecture](../architecture/policy-and-security.md)

## Scope

- device pairing
- secure app session storage
- persona pull/cache
- `SyncPayloadEnvelope`
- safe work summary sync
- sync retry/idempotency

## Excluded

- raw context sync
- OCR summary sync
- cloud control of desktop trigger policy

## Tests

- pairing code single-use
- expired pairing code rejected
- token rotation
- sync forbidden keys rejected
- idempotency retry does not duplicate cloud record

## Exit Criteria

- App can pull persona safely.
- App can sync safe summary only.
- Revoked device can no longer sync.
