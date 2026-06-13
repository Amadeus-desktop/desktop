# Policy And Security Architecture

> Privacy, RLS, secret handling, provider input, capture/OCR security 정책.

---

## 1. Security Principle

Amadeus는 정서 데이터와 작업 맥락을 다룬다. 그래서 기본 정책은 allow가 아니라 deny다.

```text
unknown -> do not capture
unknown -> do not OCR
unknown -> do not sync
unknown -> do not speak
```

---

## 2. Privacy Data Boundary

| 데이터 | Web | Supabase | Tauri SQLite | Memory only |
| --- | --- | --- | --- | --- |
| persona | 허용 | 원본 | cache | 가능 |
| cloud memory | 허용 | 원본 | cache 가능 | 가능 |
| raw window title | 금지 | 금지 | privacy 통과 시 제한 저장 | 가능 |
| raw screenshot | 금지 | 금지 | 금지 | 임시 가능 |
| OCR raw text | 금지 | 금지 | 금지 | adapter 내부만 |
| redacted OCR summary | 금지 | MVP 금지 | retention 전 금지 | 가능 |
| safe work summary | 허용 | 허용 | 허용 | 가능 |
| token | 금지 | hash/session only | secure storage | 가능 |

---

## 3. Provider Input Policy

| Provider | 허용 | 금지 |
| --- | --- | --- |
| Template | trigger type, fallback message | title, OCR, screenshot |
| API | trigger type, tone, coarse context label | raw title, OCR summary, OCR raw text, screenshot |
| Local llama.cpp | redacted title, redacted summary, score signals | raw title, OCR raw text, screenshot |

API provider는 외부 전송 가능성이 있으므로 가장 좁은 입력만 받는다.

---

## 4. RLS Policy Baseline

Supabase에서 사용자별 테이블은 RLS 필수다.

Required:

- `profiles.user_id = auth.uid()`
- `personas.user_id = auth.uid()`
- `cloud_memories.user_id = auth.uid()`
- `devices.user_id = auth.uid()`
- `device_sessions.user_id = auth.uid()`
- `sync_events.user_id = auth.uid()`
- `cloud_conversations.user_id = auth.uid()`
- `cloud_conversation_messages.user_id = auth.uid()`
- `cloud_work_summaries.user_id = auth.uid()`
- `pairing_requests.created_by_user_id = auth.uid()`

RLS 없는 table에 user data를 저장하지 않는다.

### 4.1 Write Policy Baseline

RLS는 read뿐 아니라 write에도 적용한다.

Required:

- `select using (user_id = auth.uid())`
- `insert with check (user_id = auth.uid())`
- `update using (user_id = auth.uid()) with check (user_id = auth.uid())`
- `delete using (user_id = auth.uid())` 또는 soft-delete only

Cross-table FK는 같은 owner인지 검증한다.

```sql
exists (
  select 1
  from personas
  where personas.id = cloud_memories.persona_id
    and personas.user_id = auth.uid()
)
```

Service-role-only writes are allowed only for Edge Functions listed in [sync-and-web.md](./sync-and-web.md).

---

## 5. Secret Handling

Secret은 클라이언트로 내려가지 않는다.

금지:

- browser에 Cloud LLM API key 저장
- Tauri app bundle에 service role key 저장
- Edge Function이 secret을 앱에 반환
- Supabase service role key를 local settings에 저장

허용:

- Next.js server environment에서 Cloud LLM key 사용
- Supabase Edge Function environment에서 secret 사용
- App secure storage에 user/device session 저장

Edge Function은 secret 전달자가 아니라 secret 사용자다.

### 5.1 Device Session Security

Device session은 long-lived bearer token 하나로 끝나면 안 된다.

Required:

- pairing code raw value never stored
- refresh token hash only
- refresh token rotation
- token family reuse detection
- revoked device revokes sessions
- device public key challenge before session issue
- rate limit on pairing attempts

---

## 6. Capture/OCR Security

Capture/OCR은 3단 gate를 통과해야 한다.

```text
PreCaptureGate
  -> PreOcrGate
  -> PreLlmGate
```

PreCapture hard deny:

- sensitive context
- screen permission denied
- screen context disabled
- meeting app frontmost
- privacy risk >= 70

PreOcr hard deny:

- unapproved capture region
- expired capture
- sensitive capture marker
- OCR timeout budget exceeded

PreLlm hard deny:

- raw screenshot
- OCR raw text
- raw title
- file path
- URL query
- keystroke text

---

## 7. Logging Policy

Logs must not contain:

- raw prompt
- raw response containing private context
- raw title
- OCR raw text
- screenshot path
- token

Allowed log fields:

- event id
- provider name
- action band
- score bucket
- suppression reason
- redaction level
- error category

---

## 8. Threats

| Threat | Mitigation |
| --- | --- |
| 다른 사용자 persona 조회 | RLS `auth.uid()` |
| API key 노출 | server-side only |
| 앱 탈취로 secret 유출 | service role key app 저장 금지 |
| OCR로 민감 내용 추출 | PreCapture/PreOcr gate |
| LLM provider로 원문 유출 | LlmInputEnvelope |
| sync_queue 민감 payload | safety validation |
| repeated intrusive utterance | cooldown/reaction penalty |
| service role overreach | route allowlist and Edge Function-only use |
| stolen pairing code | short expiry, code hash, attempt limit, single-use |
| stolen device token | token rotation and family reuse revocation |

---

## 9. Test Requirements

- RLS policy migration test 또는 SQL review fixture
- RLS insert/update/delete `with check` tests
- cross-user FK rejection tests
- provider input redaction unit test
- sync payload safety validator test
- sync envelope forbidden-key tests
- device session rotation/reuse tests
- sensitive context capture block test
- OCR raw text non-persistence test
- logs do not include raw context test
