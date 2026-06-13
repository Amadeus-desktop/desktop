# Phase 6 LLM Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a replaceable LLM provider boundary for proactive utterances and mini chat replies.

**Architecture:** Rust owns provider routing and exposes Tauri commands. The trigger engine uses the LLM service for the final utterance text while preserving template fallback. React calls the chat reply command after user messages and appends the companion response.

**Tech Stack:** Tauri 2, Rust standard library networking, React, TypeScript, SQLite timeline, pnpm

---

### Task 1: Rust LLM Provider Module

**Files:**
- Create: `src-tauri/src/llm.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Write failing provider tests**

Add tests in the new `llm.rs` for:

```rust
#[test]
fn template_generates_trigger_specific_utterance() {
    let provider = TemplateLlmProvider;
    let result = provider
        .generate_utterance(&LlmUtteranceRequest {
            trigger_type: "milestone".to_string(),
            trigger_reason: "long_work_session_milestone".to_string(),
            app_name: "Visual Studio Code".to_string(),
            window_title: "main.rs".to_string(),
            fallback_message: "fallback".to_string(),
        })
        .expect("template generation succeeds");

    assert_eq!(result.provider, "template");
    assert_eq!(result.message, "조용히 오래 해내고 있었네.");
}

#[test]
fn extracts_llama_completion_content() {
    let body = r#"{"content":"잠깐 쉬어도 괜찮아.","stop":true}"#;

    let content = extract_llama_content(body).expect("content is parsed");

    assert_eq!(content, "잠깐 쉬어도 괜찮아.");
}
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml template_generates_trigger_specific_utterance extracts_llama_completion_content
```

Expected: compile fails because `llm.rs` and its types do not exist.

- [ ] **Step 3: Implement provider module**

Create `llm.rs` with:

- `LlmUtteranceRequest`
- `LlmChatRequest`
- `LlmGeneration`
- `LlmProviderHealth`
- `LlmProvider` trait
- `TemplateLlmProvider`
- `LocalLlamaProvider`
- `ApiLlmProvider`
- `LlmService`
- `extract_llama_content`

- [ ] **Step 4: Register module and Tauri commands**

In `lib.rs`, add `mod llm;`, manage `LlmState`, and register:

```text
get_llm_provider_health
generate_test_utterance
generate_chat_reply
```

- [ ] **Step 5: Run provider tests and verify GREEN**

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml template_generates_trigger_specific_utterance extracts_llama_completion_content
```

Expected: both provider tests pass.

### Task 2: Trigger Engine Provider Integration

**Files:**
- Modify: `src-tauri/src/trigger.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Write failing integration test**

Add a test proving provider output replaces the candidate fallback:

```rust
#[test]
fn trigger_utterance_request_uses_candidate_context() {
    let snapshot = snapshot(AppCategory::Work, 12.0, 120 * 60 * 1000);
    let candidate = TriggerCandidate {
        trigger_type: TriggerType::Milestone,
        message: "fallback".to_string(),
        reason: "long_work_session_milestone".to_string(),
        base_score: 82,
    };

    let request = llm_request_for_trigger(&snapshot, &candidate);

    assert_eq!(request.trigger_type, "milestone");
    assert_eq!(request.trigger_reason, "long_work_session_milestone");
    assert_eq!(request.fallback_message, "fallback");
    assert_eq!(request.app_name, "Visual Studio Code");
}
```

- [ ] **Step 2: Run focused test and verify RED**

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml trigger_utterance_request_uses_candidate_context
```

Expected: fails because `llm_request_for_trigger` does not exist.

- [ ] **Step 3: Inject LLM state into trigger commands**

Update `run_trigger_engine_once` and `poll_trigger_engine` to accept `State<'_, LlmState>`. When persisting a trigger utterance, call the service and store generated `message` and `provider`.

- [ ] **Step 4: Run focused test and verify GREEN**

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml trigger_utterance_request_uses_candidate_context
```

Expected: test passes.

### Task 3: Frontend Chat Reply Wiring

**Files:**
- Create: `src/features/llm/types.ts`
- Create: `src/features/llm/llmRepository.ts`
- Modify: `src/features/companion/useCompanionBubble.ts`

- [ ] **Step 1: Add TypeScript LLM repository**

Create a repository wrapper with:

```ts
export async function generateChatReply(messages: CompanionMessage[]) {
  if (isTauriRuntime()) {
    return invoke<LlmGeneration>("generate_chat_reply", {
      input: {
        messages: messages.map((message) => ({
          role: message.sender === "user" ? "user" : "companion",
          content: message.text,
        })),
      },
    });
  }

  return {
    message: "응. 나 여기 있어.",
    provider: "template",
  };
}
```

- [ ] **Step 2: Append companion reply after user send**

Update `sendMessage` so after appending the user message, it calls `generateChatReply` and appends the returned companion message.

- [ ] **Step 3: Keep reaction persistence**

Keep the existing `recordReaction(activeUtteranceId, "replied")` call.

### Task 4: Verification

**Files:**
- Read: `src-tauri/src/llm.rs`
- Read: `src-tauri/src/trigger.rs`
- Read: `src/features/llm/llmRepository.ts`
- Read: `src/features/companion/useCompanionBubble.ts`

- [ ] **Step 1: Run all Rust tests**

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

Expected: all tests pass.

- [ ] **Step 2: Run frontend build**

Run:

```bash
pnpm build
```

Expected: TypeScript and Vite build pass.

- [ ] **Step 3: Run Rust check**

Run:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
```

Expected: Rust check exits 0.
