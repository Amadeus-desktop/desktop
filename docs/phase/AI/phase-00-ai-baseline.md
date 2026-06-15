# Phase 00. AI Baseline

## Goal

현재 AI/persona/memory 상태와 한계를 고정한다.

이 phase는 기능 추가보다 기준선 문서화와 테스트 고정이 목적이다.

## Current State

- Desktop app has local persona choices in TypeScript.
- Rust LLM input uses `LlmInputEnvelope` and `LlmChatEnvelope`.
- Current prompt structure includes shallow `persona_summary`, optional `safe_memory_summary`, and recent messages.
- Local LLM route targets llama.cpp-compatible local runtime.
- Supabase online schema is documented but not fully materialized as migrations.
- Web/app continuous conversation is not yet implemented.

## Scope

- Document current prompt inputs.
- Document provider input limits:
  - template
  - cloud API
  - local Qwen
- Freeze privacy boundaries for AI inputs.
- Identify current schema gaps for cross-surface conversation.

## Excluded

- Supabase migration creation.
- Prompt Builder implementation.
- RAG/vector search.
- New memory extraction.

## Required Baseline

Current prompt envelope limitations:

- Persona is too shallow for long-term continuity.
- Conversation session has no canonical cross-surface thread yet.
- Memory is stored but not selected by a dedicated prompt assembly layer.
- Raw desktop context is correctly kept out of cloud paths.

## Tests

- Existing LLM prompt redaction tests remain green.
- Existing privacy/provider input tests remain green.
- No raw OCR text, screenshot path, full URL, file path, token, or password reaches cloud provider input.

## Exit Criteria

- AI input boundaries are documented.
- Current limitations are explicit.
- Later phases can change behavior against a known baseline.

