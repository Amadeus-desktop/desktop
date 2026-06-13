# Phase 7 Template E2E Design

## Goal

Complete the Phase 7 MVP integration using the existing template utterance provider. This phase closes the local end-to-end loop from macOS context through privacy filtering, trigger evaluation, companion bubble display, user reaction capture, and timeline persistence.

## Scope

Included:

- Keep `provider: "template"` as the MVP utterance source.
- Present persisted trigger utterances in the companion bubble.
- Record user reactions for opened, replied, dismissed, closed, and ignored bubble outcomes.
- Treat ignored auto-dismissed bubbles as negative feedback for later Speakability Score calculation.
- Verify the existing Rust and frontend build/test gates.

Excluded:

- API LLM provider implementation.
- Local llama.cpp provider implementation.
- Screen capture or vision model implementation.
- Long-term user personalization.

## Architecture

The backend remains the source of truth for trigger eligibility. `poll_trigger_engine` and `run_trigger_engine_once` evaluate native context, apply privacy rules, persist context and utterance rows only for allowed bubble or conversation actions, and return the persisted utterance to the frontend.

The companion hook presents only returned utterance events. When a bubble disappears without user action, the hook records an `ignored` reaction against the active utterance and forwards that reaction to trigger scoring. The trigger runtime handles `ignored` the same way as `dismissed` and `closed`, lowering future scores.

## Data Flow

```text
macOS context
  -> privacy assessment
  -> trigger evaluation
  -> context_events + utterance_events
  -> companion bubble
  -> user_reactions
  -> trigger runtime scoring feedback
  -> timeline panel
```

## LLM Provider Note

Phase 7 intentionally does not add an LLM provider. For the next phase, the preferred direction is a Rust-owned provider interface backed by a llama.cpp sidecar or llama-server process. This is an engineering recommendation, not a verified official Rust standard.

## Testing

- Add a Rust unit test proving `ignored` reactions increment the recent dismissed count.
- Run `cargo test --manifest-path src-tauri/Cargo.toml`.
- Run `pnpm build`.
- Run `cargo check --manifest-path src-tauri/Cargo.toml`.
