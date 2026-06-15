# Phase 08. Web Supabase Foundation

## Goal

MVP 이후 Web/Supabase 기반을 만든다. Desktop runtime에 cloud dependency를 강제하지 않는다.

## Architecture Links

- [System Overview](../architecture/system-overview.md)
- [Sync And Web Architecture](../architecture/sync-and-web.md)
- [Data Model Architecture](../architecture/data-model.md)
- [Policy And Security Architecture](../architecture/policy-and-security.md)

## Scope

- Next.js app scaffold
- Supabase project config
- profiles/personas/cloud_memories schema
- RLS policies
- persona CRUD
- web cloud chat server-side route

## Excluded

- desktop sync
- device pairing
- local work summary upload
- OCR

## Tests

- RLS user isolation
- persona CRUD own user only
- browser never receives LLM API key
- server route requires auth

## Exit Criteria

- Web can create persona source of truth.
- Desktop can remain fully usable without Web.
