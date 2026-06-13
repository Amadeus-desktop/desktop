# Phase 6 LLM Provider Design

## Goal

Add the MVP LLM provider boundary so proactive utterances and mini chat replies are generated through a replaceable provider interface. The default remains local template behavior, while llama.cpp is supported through an HTTP sidecar path.

## Scope

Included:

- Rust `llm` module with provider request/response types.
- `TemplateLlmProvider` for deterministic MVP utterances and chat replies.
- `LocalLlamaProvider` that calls a llama.cpp-compatible HTTP `/completion` endpoint.
- `ApiLlmProvider` placeholder that returns a clear unavailable error.
- Tauri commands for provider health, test utterance generation, and chat reply generation.
- Trigger engine integration so persisted utterances use the provider result instead of hardcoded trigger messages.
- Frontend companion integration so user chat messages receive a companion reply.

Excluded:

- Model download manager.
- llama.cpp binary bundling.
- API provider vendor integration and API key storage.
- Streaming responses.
- Long-term memory.

## Architecture

The Rust backend owns generation. `src-tauri/src/llm.rs` defines a small `LlmProvider` trait:

```text
generate_utterance(request) -> Result<LlmGeneration, LlmError>
generate_chat_reply(request) -> Result<LlmGeneration, LlmError>
health() -> LlmProviderHealth
```

Provider routing starts with a conservative default:

- `TemplateLlmProvider` is always available and remains the fallback.
- `LocalLlamaProvider` calls a llama.cpp sidecar endpoint when selected.
- `ApiLlmProvider` is represented as unavailable until real credentials and provider policy are added.

The trigger engine asks the LLM service to generate a short utterance for the selected trigger candidate. If the selected provider fails and fallback is allowed, template generation is used. The persisted `utterance_events.provider` records the provider that actually produced the message.

## llama.cpp Contract

The local provider targets a llama.cpp HTTP server compatible with:

```text
POST /completion
Content-Type: application/json

{
  "prompt": "...",
  "n_predict": 80,
  "temperature": 0.7,
  "stop": ["\n"]
}
```

The MVP parser reads the `content` field from the JSON response. Only `http://host:port` URLs are supported in this phase.

## Testing

- Unit tests prove template utterance generation changes by trigger type.
- Unit tests prove local llama request parsing extracts `content`.
- Unit tests prove provider fallback returns template output when local llama is unavailable.
- Existing trigger and timeline tests continue to pass.
- Frontend build verifies TypeScript integration.
