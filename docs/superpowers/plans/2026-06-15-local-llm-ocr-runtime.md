# Local LLM And OCR Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strengthen the local llama.cpp sidecar path and safely connect redacted OCR observations to Local LLM envelopes.

**Architecture:** Keep llama.cpp as a localhost sidecar managed by Rust. Add a small request-shape boundary so Local LLM can prefer OpenAI-compatible chat completions while retaining legacy `/completion` fallback. Keep OCR raw text private and pass only `OcrObservation.text_summary_redacted` into Local LLM memory.

**Tech Stack:** Rust 2021, Tauri 2, ureq, serde, llama.cpp `llama-server`, existing OCR contract.

---

## File Structure

- Modify `src-tauri/src/llm/llama_http.rs`: endpoint builders and response normalizers.
- Modify `src-tauri/src/llm/mod.rs`: LocalLlamaProvider request mode and chat completion call path.
- Modify `src-tauri/src/llm/contract.rs`: helper for attaching redacted OCR summaries.
- Modify `src-tauri/src/trigger/scoring.rs`: support optional OCR observation in envelope builder only if explicitly supplied later.
- Modify `src-tauri/src/ocr/mod.rs`: add a public conversion helper that exposes only redacted summary.
- Modify `src-tauri/src/llama_sidecar/tests.rs`: remove flaky time-only temp path helper.
- Test with `cargo test --manifest-path src-tauri/Cargo.toml`.

## Task 1: Stabilize Sidecar Test Fixtures

**Files:**
- Modify: `src-tauri/src/llama_sidecar/tests.rs`

- [ ] **Step 1: Write the failing stress test**

Add a test that creates many temp dirs and asserts they are unique.

- [ ] **Step 2: Run the focused test**

Run: `cargo test --manifest-path src-tauri/Cargo.toml llama_sidecar::tests::temp_dirs_are_unique_under_fast_creation`

Expected before implementation: fail or missing test.

- [ ] **Step 3: Implement monotonic temp path suffix**

Use an `AtomicU64` counter in the test module and include it in `temp_file` and `temp_dir` names.

- [ ] **Step 4: Verify**

Run: `cargo test --manifest-path src-tauri/Cargo.toml llama_sidecar::tests::sidecar_config_builds_llama_server_args`

Expected: pass.

## Task 2: Add llama.cpp Chat Completion HTTP Contract

**Files:**
- Modify: `src-tauri/src/llm/llama_http.rs`
- Modify: `src-tauri/src/llm/mod.rs`

- [ ] **Step 1: Write endpoint tests**

Add tests for `llama_chat_completions_url("http://127.0.0.1:8080") == "http://127.0.0.1:8080/v1/chat/completions"` and invalid endpoint rejection.

- [ ] **Step 2: Verify red**

Run: `cargo test --manifest-path src-tauri/Cargo.toml llm::tests::builds_llama_chat_completions_url`

Expected before implementation: missing function or failed assertion.

- [ ] **Step 3: Implement URL builder**

Add `llama_chat_completions_url` beside `llama_completion_url`.

- [ ] **Step 4: Verify green**

Run: `cargo test --manifest-path src-tauri/Cargo.toml llm::tests::builds_llama_chat_completions_url`

Expected: pass.

## Task 3: Normalize OpenAI-Compatible Chat Response

**Files:**
- Modify: `src-tauri/src/llm/mod.rs`

- [ ] **Step 1: Write parser tests**

Add a unit test that parses:

```json
{"choices":[{"message":{"content":"괜찮아. 천천히 하자."}}]}
```

Expected normalized content: `괜찮아. 천천히 하자.`

- [ ] **Step 2: Verify red**

Run: `cargo test --manifest-path src-tauri/Cargo.toml llm::tests::extracts_llama_chat_completion_content`

Expected before implementation: missing parser.

- [ ] **Step 3: Implement parser structs and normalizer**

Add local response structs for `choices[].message.content`.

- [ ] **Step 4: Verify green**

Run the same focused test.

Expected: pass.

## Task 4: Add OCR-To-Envelope Helper

**Files:**
- Modify: `src-tauri/src/llm/contract.rs`
- Modify: `src-tauri/src/ocr/mod.rs`

- [ ] **Step 1: Write privacy test**

Add a test that builds an `OcrObservation` from raw text containing `token=abc123 /Users/user/private.pdf`, attaches it to a `LlmInputEnvelope`, serializes the envelope, and asserts the raw token/path are absent.

- [ ] **Step 2: Verify red**

Run: `cargo test --manifest-path src-tauri/Cargo.toml llm::tests::ocr_observation_attaches_only_redacted_summary_to_local_envelope`

Expected before implementation: missing helper.

- [ ] **Step 3: Implement helper**

Add `LlmInputEnvelope::with_redacted_ocr_summary(summary: Option<String>) -> Self`.

- [ ] **Step 4: Verify green**

Run the focused test.

Expected: pass.

## Task 5: Full Verification

**Files:**
- No production files unless a previous task requires cleanup.

- [ ] **Step 1: Rust check**

Run: `cargo check --manifest-path src-tauri/Cargo.toml`

Expected: pass.

- [ ] **Step 2: Rust tests**

Run: `cargo test --manifest-path src-tauri/Cargo.toml`

Expected: all tests pass.

- [ ] **Step 3: Frontend build**

Run: `pnpm build`

Expected: pass.

