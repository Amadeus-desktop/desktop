# LLM HTTP Client Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-written llama.cpp HTTP transport with a small, maintained blocking HTTP client while preserving the MVP provider and fallback contract.

**Architecture:** Keep `LlmProvider`, `LlmService`, Tauri commands, route state, and template fallback unchanged. Change only `LocalLlamaProvider` transport internals from `TcpStream` request/response parsing to `ureq` JSON calls. Keep parsing test coverage around the llama.cpp `content` response field and verify the full Rust/Frontend/Tauri build path.

**Tech Stack:** Rust, Tauri 2, `ureq` blocking HTTP client, serde JSON, llama.cpp `/completion`.

---

### Task 1: Replace Raw HTTP Transport

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/llm.rs`

- [ ] **Step 1: Add `ureq` with JSON support**

Run:

```bash
cargo add ureq@2 --features json --manifest-path src-tauri/Cargo.toml
```

Expected: `src-tauri/Cargo.toml` includes `ureq = { version = "2", features = ["json"] }`.

- [ ] **Step 2: Remove manual TCP imports**

Replace `Read`, `Write`, `TcpStream`, and `ToSocketAddrs` imports in `src-tauri/src/llm.rs` with `serde_json::json`.

- [ ] **Step 3: Add typed llama response DTO**

Add:

```rust
#[derive(Debug, Deserialize)]
struct LlamaCompletionResponse {
    content: String,
}
```

- [ ] **Step 4: Replace `post_json`/`connect` with `ureq`**

Update `LocalLlamaProvider::complete` to:

```rust
let url = llama_completion_url(&self.endpoint)?;
let response = ureq::post(&url)
    .timeout(LLAMA_TIMEOUT)
    .send_json(json!({
        "prompt": prompt,
        "n_predict": 80,
        "temperature": 0.7,
        "stop": ["\n"],
    }))
    .map_err(LlmError::from)?
    .into_json::<LlamaCompletionResponse>()?;

Ok(response.content.trim().to_string())
```

- [ ] **Step 5: Keep endpoint validation simple**

Replace `HttpEndpoint` with:

```rust
fn llama_completion_url(endpoint: &str) -> Result<String, LlmError> {
    let endpoint = endpoint.trim_end_matches('/');
    if !endpoint.starts_with("http://") {
        return Err(LlmError::InvalidEndpoint("only http:// endpoints are supported".to_string()));
    }
    Ok(format!("{endpoint}/completion"))
}
```

### Task 2: Preserve Tests and Build

**Files:**
- Modify: `src-tauri/src/llm.rs`

- [ ] **Step 1: Update parser unit test**

Keep `extract_llama_content` or replace it with a typed parser test:

```rust
#[test]
fn extracts_llama_completion_content() {
    let body = r#"{"content":"잠깐 쉬어도 괜찮아.","stop":true}"#;
    let response: LlamaCompletionResponse = serde_json::from_str(body).expect("content is parsed");
    assert_eq!(response.content.trim(), "잠깐 쉬어도 괜찮아.");
}
```

- [ ] **Step 2: Add endpoint URL test**

```rust
#[test]
fn builds_llama_completion_url() {
    assert_eq!(
        llama_completion_url("http://127.0.0.1:8080").expect("valid endpoint"),
        "http://127.0.0.1:8080/completion"
    );
    assert!(llama_completion_url("https://127.0.0.1:8080").is_err());
}
```

- [ ] **Step 3: Verify**

Run:

```bash
cargo fmt --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
pnpm build
pnpm tauri:build
```

Expected:
- Rust check passes.
- Rust tests pass.
- Frontend build passes.
- Tauri `.app` and `.dmg` bundles are generated.
