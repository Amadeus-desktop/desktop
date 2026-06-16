# Amadeus — TODO

코드 분석 기반 실제 미완성 항목. 우선순위 순.

---

## 개념 정의 (중요)

### Persona vs Mate — 현재 코드가 혼용 중

| 개념 | 설명 | 개수 | 영향 범위 |
|---|---|---|---|
| **Persona** | 캐릭터 정체성. 말투, 세계관, system prompt, 관계 유형 | **3종** | LLM 응답 톤, NudgeNote 문구, PocketChat 오프닝 |
| **Mate** | NudgeNote 아이콘 스타일. 시각적 표현만 | **4종** | 아이콘 모양만. 페르소나에 영향 없음 |

**Persona 3종** (JSON 카드 있음):
- `eiren-fantasy-guardian` — 판타지 수호자형
- `makise-kurisu` — 냉철한 과학자형
- `seoyeon-modern-senior` — 현대 선배형

**Mate 4종** (아이콘 변형만, 페르소나 아님):
- 4개 아이콘 variant (bubble / letter / star / orb 등에서 선택)
- Mate 선택이 Persona를 바꾸지 않음
- Mate 선택이 LLM prompt에 영향 없음

**현재 상태:** `src/domain/persona/types.ts`의 `PERSONA_IDS`는 named Persona 3종만 포함함. 과거 제네릭 값은 레거시 설정 마이그레이션을 위해 `normalizePersonaId()`에서만 흡수함.

---

## P0 — 앱이 실제로 작동하려면 반드시 필요

### [x] 제네릭 Persona 4종 제거 — Persona/Mate 분리

**상태:** `PERSONA_IDS`는 `seoyeon-modern-senior`, `eiren-fantasy-guardian`, `makise-kurisu`만 포함.
**파일:** `src/domain/persona/types.ts`, `src/domain/persona/registry.ts`, `src/features/character`, `src/features/settings/lib/settings.ts`
**결과:** Persona 선택 UI는 JSON 카드가 있는 3종만 노출함.

완료:
- `PERSONA_IDS`를 named 3종으로만 축소
- `pocketIntro.ts` named 3종 suffix만 유지
- `LEGACY_PERSONA_MAP`은 과거 저장값을 named 3종으로 리매핑
- Main window 캐릭터 선택창도 `getPersonaList()` 기반으로 전환
- 평가 fixture도 named Persona 기준으로 변경

---

### [ ] LLM 라우트/Provider 연결 정리

**확인됨:** `LlmService::default()` 자체는 `route: LlmProviderRoute::Template`.
**확인됨:** startup에서 `SettingsState::current()`를 읽고 `llm_state.set_route(&settings.model_route, ...)`를 호출함.
**확인됨:** `AppSettings::default()`의 `model_route`는 `api-first`.
**문제:** Rust `ApiLlmProvider`는 현재 `available: false`이고 `generate_*`가 항상 `api provider unconfigured`로 실패함.
**결과:** frontend DeepChat은 `api-first`일 때 Edge Function을 먼저 호출하지만, Rust trigger/Nudge 쪽 API provider는 미연결이라 fallback에 의존함.
**파일:** `src-tauri/src/app_lifecycle/setup.rs`, `src-tauri/src/settings/core/model.rs`, `src-tauri/src/llm/providers/api.rs`, `src/features/llm/adapters/llmRepository.ts`

할 일:
- Rust `ApiLlmProvider`가 Supabase Edge Function 또는 별도 cloud endpoint를 호출할지 결정
- NudgeNote/Trigger는 local-first로 둘지, API fallback을 실제 연결할지 결정
- frontend DeepChat의 Edge Function route와 Rust LLM route 계약 통일
- failure 시 Template fallback 로그를 사용자가 구분 가능하게 표시

---

### [ ] llama.cpp 바이너리 번들

**문제:** `src-tauri/binaries/` 디렉토리 없음
**결과:** `LocalLlamaProvider` 항상 실패 → Template fallback → 실제 LLM 응답 없음

할 일:
- `src-tauri/binaries/` 생성
- `llama-server` 바이너리 추가 (macOS aarch64 / x86_64)
- `tauri.conf.json` `externalBin` 설정 확인
- 또는 `model_route = "api-first"` 고정으로 Edge LLM만 쓰는 방향 결정

---

### [ ] Supabase Edge Function `llm-generate` 배포 확인

**확인됨:** 로컬 repo에 `supabase/functions/llm-generate/index.ts` 존재.
**미확인:** Supabase 원격 프로젝트에 실제 배포됐는지, env(`OPENAI_API_KEY`/`GEMINI_API_KEY`)가 설정됐는지, 실호출이 성공하는지.
**결과:** frontend `api-first` route에서 edge function 호출 실패 시 Tauri/template fallback으로 내려감.

할 일:
- 배포 상태 확인 (`supabase functions list`)
- 페르소나 system prompt 조립 로직이 edge function에서 동작하는지 검증
- 실제 로그인 세션으로 DeepChat smoke test

---

## P1 — 핵심 UX 연결

### [ ] Trigger Behavior Signal Layer — Unknown을 정체가 아니라 행동으로 판정

**문제:** 키워드 기반 Work/NonWork 분류는 롱테일 앱/사이트를 이길 수 없음. tvwiki, niconico, Zeta, LoveyDovey, 신생 AI chat 서비스 등을 계속 whitelist/blacklist에 추가하는 방식은 유지보수 불가능.
**현재 정책:** Unknown은 기본 침묵. 모르는 앱/사이트를 Work/NonWork로 억지 분류하지 않음.
**이유:** 작업을 NonWork로 오인해 Drift를 띄우는 비용이, 소비 활동을 놓치는 비용보다 큼. AI chat/companion 서비스는 특히 NonWork 잔소리 금지.
**현재 한계:** 코드에는 아직 키보드/마우스/스크롤 rate가 없음. 단 `idle_seconds`와 `is_fullscreen` 기반의 보수적 guard는 들어감.
**구현됨:** `OcrObservation.context_class`와 `OcrContextClass` 정책 메서드가 있음. Unknown OCR probe가 trigger runner에 연결되어 있고, `work_document`/`code_error`만 Work-like DeepPause로 승격 가능함.
**파일:** `src-tauri/src/macos_context/core/native_macos.rs`, `src-tauri/src/macos_context/core/types.rs`, `src-tauri/src/trigger/core/history.rs`, `src-tauri/src/trigger/core/scoring.rs`

할 일:
- `MacosContextSnapshot` 또는 별도 `BehaviorSignalSnapshot`에 행동 신호 추가
- `keyboard_activity_rate` 수집
- `mouse_activity_rate` 수집
- `scroll_activity_rate` 수집
- `idle_transition_pattern` 또는 최근 idle 변화 window 계산
- `is_fullscreen` 감지 고도화: 현재는 메인 디스플레이 window bounds overlap 기반 heuristic
- OCR 사용 시 raw text가 아니라 `OcrObservation.context_class`만 정책 판단에 사용
- Unknown은 기본 침묵 유지
- Unknown에서 확인이 필요한 경우에도 키워드가 아니라 행동 신호 + privacy gate + OCR redacted class로만 판단
- OCR class는 우선 오발화 방지에 사용하고, NonWork Drift 승격에는 사용하지 않음
- `work_document`/`code_error`만 Work-like DeepPause 승격 가능
- `video_player`/`game`/`ai_chat_companion`/`private_chat`/`unknown`은 침묵 또는 observe-only
- Zeta/LoveyDovey 같은 AI chat/companion은 기본 Unknown 침묵, NonWork Drift 금지
- 실제 키보드/마우스/스크롤 rate 기반 판단은 별도 phase에서 구현

완료 기준:
- NonWork + fullscreen + long foreground → `fullscreen_non_work`로 발화 억제
- Unknown + work-like OCR class + idle pause → Work-like DeepPause 후보 가능
- Unknown + video/game/private/AI chat OCR class → 발화하지 않음
- AI chat/companion title/domain은 NonWork로 분류되지 않음
- Unknown + video/game/private/AI chat OCR class는 Drift를 만들지 않음
- `docs/trigger-scenarios.md`의 Unknown 정책과 코드 테스트가 일치

---

### [ ] 페르소나 소스 — Supabase pull을 UI에 연결

**문제:** `useCompanionShell` → `getCompanionMates(locale)` → `getPersonas(locale)` → i18n hardcoded 값만 표시
**파일:** `src/features/companion/hooks/useCompanionShell.ts`, `src/domain/mate/companionMates.ts`, `src/domain/persona/registry.ts`
**결과:** `pullCloudPersonas` 구현됐지만 shell에 미연결.

할 일:
- MVP 범위 결정: 로컬 3종 고정 vs Supabase pull
- Supabase pull 쓸 경우: `useCompanionShell`에서 `pullCloudPersonas()` 연결

---

### [ ] PocketChat 오프닝 메시지 개선

**문제:** `pocketIntro.ts` → `nudge + POCKET_INTRO_SUFFIX[persona.id]` hardcoded concatenation  
**파일:** `src/features/companion/lib/pocketIntro.ts`  
**결과:** 페르소나별 1개 고정 문자열. 맥락 반영 없음.

할 일 (둘 중 선택):
- A) LLM으로 pocket intro 생성 (nudge 맥락 반영)
- B) 페르소나별 문장 pool 확대 (랜덤 선택) — MVP 빠른 방법

---

### [ ] 세션 영속성 — 인메모리 → SQLite

**문제:** `companionSessionStore.ts` → `createExternalStore` (인메모리)  
**결과:** 앱 재시작 시 대화 기록 초기화

할 일:
- MVP에서는 인메모리 허용 가능 (결정 필요)
- Phase v2 범위라면 SQLite `conversation_sessions` 테이블 연결

---

## 우려사항 검증 — 코드 근거 답변

아래는 직접 코드 확인한 결과. 각 항목 할 일로 분해함.

### [ ] 우려1: 페르소나 잘 못 따름 → 확인됨, 페르소나 정보가 LLM에 거의 안 들어감

**근거:** Rust trigger/Nudge 경로의 `src-tauri/src/llm/prompt/persona.rs` `persona_summary()` → LLM에 넘기는 persona = 닉네임 한 줄("OO 곁의 조용한 companion")뿐. 캐릭터 말투/세계관/system prompt 없음.
**근거:** `src-tauri/src/trigger/core/scoring.rs` `llm_request_for_trigger()` → `safe_memory_summary: None`, `redacted_ocr_summary: None`. JSON 카드의 `static_prompt_json`이 envelope에 안 실림.
**참고:** frontend DeepChat Edge 경로는 `promptEnvelope`를 전송하고 edge function은 이를 system prompt context로 포함함. 문제의 핵심은 Rust trigger/Nudge 경로와 frontend/persona source가 분리되어 있다는 점.

할 일:
- persona JSON 카드(`static_prompt_json`) → `LlmInputEnvelope`에 주입하는 경로 추가
- DeepChat은 full persona prompt, NudgeNote는 축약 톤만 — 단계별 주입량 분리
- 주입 후 페르소나별 응답 톤 차이 실제 테스트

---

### [ ] 우려2: Local LLM 비용 → Qwen3-4B + M1 Air 8GB는 작동하나 메모리 빡빡

**확정 사양:** Local = Qwen3-4B-GGUF Q4_K_M / 최소 PC = M1 Air 8GB / macOS only.
(코드에 이미 반영됨: `prompt/templates.rs` `qwen_local_chat_messages`, docs `phase-05-qwen-local-runtime-contract.md`)

**M1 Air 8GB 통합메모리 예산 계산:**

| 항목 | 점유 |
|---|---|
| macOS 유휴 | ~3.5~4.5GB |
| Tauri 앱 + WebView | ~0.5~1GB |
| 남는 양 | ~2.5~4GB |

| Qwen3-4B Q4_K_M 요구 | 크기 |
|---|---|
| 모델 가중치 | ~2.5GB |
| KV 캐시 (ctx 4K) | ~0.5~1GB |
| 런타임 오버헤드 | ~0.3GB |
| 합계 | ~3.3~3.8GB |

**결론:** 남는 2.5~4GB에 모델 3.3~3.8GB → 거의 꽉참/초과. 유저가 Chrome+IDE 켜면 swap 지옥/OOM 위험. 발열·버벅임. (현재 `LLAMA_TIMEOUT=3s`, `LOCAL_COMPLETION_MAX_TOKENS=80`로 이미 보수적 — 빠듯함 인지된 설계)

**권장 하이브리드** (route 인프라 이미 있음, `service.rs` Template/LocalLlama/Api + fallback):

| 작업 | 경로 | 이유 |
|---|---|---|
| NudgeNote (짧음 80토큰, 빈번, 화면 OCR 맥락 포함) | **Local Qwen3-4B** | 짧아서 8GB 견딤 + 화면 맥락 프라이버시 |
| DeepChat (김, 가끔, 유저 직접 입력) | **API** | 긴 생성=swap 유발, 품질도 API 우위 |

할 일:
- NudgeNote=local / DeepChat=api 라우팅 분리 (현재 단일 `model_route`를 작업별로)
- **모델 상주 전략:** idle 시 unload, 트리거 임박 시 load (항상 상주는 8GB에 부담 / 매번 spawn은 첫 응답 느림)
- KV 캐시 ctx 크기 최소화 (4K 이하), `n_predict` 80 유지
- M1 Air 8GB 실측: 첫 토큰 지연 + Chrome/IDE 동시 실행 시 swap 모니터링
- Q4_K_M보다 작은 양자화(Q3) 폴백 옵션 검토

---

### [ ] 우려3: 3개 DB(Local/Sync/Summary) 작동 → Local/Summary OK, Sync는 enqueue만 됨

**근거:** 단일 SQLite, `0000_local_timeline_core.sql`에 전 계층 테이블 존재.
- Local Private: `context_events`/`utterance_events`/`user_reactions`/`local_memories(local_private)`/`work_sessions` → INSERT/SELECT 작동 (`repository.rs`)
- Summary: `local_memories(syncable_summary)`/`conversation_sessions`/`conversation_messages` → 스키마 + INSERT 함수 있음
- Sync: `sync_queue` → **enqueue만 있음. drain/upload worker 없음** (grep "drain|upload|UPDATE sync_queue SET status" → 0건)

**결과:** sync_queue에 payload가 pending으로 쌓이기만 하고 Supabase로 안 올라감.

할 일:
- sync_queue drain worker 구현: pending 읽기 → Supabase 업로드 → status=synced 업데이트 → 실패 시 retry_count++
- 업로드 전 safety_grade/redaction_level 재검증

---

### [ ] 우려4: Local DB 프로덕션 작동 → 작동함, 단 스키마 버저닝 없음

**근거:** `repository.rs:22` `open()` → `create_dir_all` + `Connection::open(path)` (실제 파일, 인메모리 아님), `foreign_keys ON`.
**근거:** `migrations.rs` → dev/prod 동일 SQL, `IF NOT EXISTS` + `add_column_if_missing`로 멱등. 단 **버전 테이블 없음, migration 파일 `0000` 하나뿐.** ALTER ADD COLUMN만 가능, destructive migration 불가.

할 일 (MVP 이후):
- schema_version 테이블 + 순차 migration 러너 도입
- 스키마 안정화 시점까지는 현 구조 유지 OK

---

### [ ] 우려5: API AI 작동 여부 → 호출 코드만 있음, edge function 미검증

**근거:** `src/features/llm/adapters/edgeLlmRepository.ts` → `supabase.functions.invoke("llm-generate")` 호출 준비됨.
**미확인:** `supabase/functions/llm-generate/` 존재/배포/내부 prompt 조립.

할 일:
- `supabase/functions/llm-generate/` 존재 확인
- `supabase functions list`로 배포 확인
- edge function 안에서 persona prompt 조립되는지 검증 (우려1과 직결)
- 실제 호출 → 응답 받는 smoke test

---

### [ ] 우려6: OCR + 화면녹화 시너지 → 보정 연결 구현, 반복성 고도화 남음

**현재 "작업 인지" 실제 방식** (`src-tauri/src/macos_context/core/native_macos.rs`):
- 어떤 앱: `NSWorkspace.frontmostApplication()`
- 창 제목: `copy_window_info` (CGWindow API)
- 멈춤 시간: `CGEventSourceSecondsSinceLastEventType` (키/마우스 idle)
- 앱 지속 시간: `Instant::elapsed()`
- 작업/비작업: `classify_app(bundle_id)`

**현재 트리거 후보 규칙** (`scoring.rs`): DeepPause(Work+같은앱10분 또는 work_cluster10분+idle120초↑) / Milestone(Work+같은앱60분 또는 work_session60분+idle600초미만) / Drift(NonWork+10분↑).
**OCR 보정 규칙:** 기존 trigger 후보가 persist 가능할 때 OCR redacted summary에 blocked signal(error/failed/cannot/오류/실패 등)이 있으면 speakability score를 +8 보정함. Work OCR blocked signal만으로는 단독 후보를 생성하지 않음.

**해소됨:** `run_trigger_engine_once`가 `evaluation.should_persist`이고 privacy gate가 안전할 때만 OCR capture+recognize를 시도함.
**해소됨:** Work OCR blocked signal만으로 단독 후보를 만들지 않도록 막아 1회 키워드 false positive를 줄임.
**해소됨:** Unknown+10분+idle120초 조건에서도 privacy-safe하면 evaluation 전 OCR probe를 수행하고, `work_document`/`code_error` context class일 때만 Work-like DeepPause 후보를 생성함.
**해소됨:** OCR `text_summary_redacted`가 `LlmInputEnvelope.redacted_ocr_summary`로 주입되어 NudgeNote LLM 입력에 들어감.
**해소됨:** OCR redacted summary에 error/failed/exception/cannot/오류/실패 등 blocked signal이 있으면 speakability score를 +8 보정함.
**해소됨:** OCR blocked 단독 후보 메시지를 제거하고, 기존 후보 메시지에만 보정이 붙도록 정리함.
**남음:** OCR 반복성/동일 화면 장시간 정체 판단은 아직 없음.

**결론:** PRD가 말한 "OCR로 화면 보고 맥락 파악" 중 LLM 입력 연결과 blocked signal score 보정은 구현됨. 단 1회 OCR 키워드만으로 먼저 말을 거는 경로는 false positive 방지를 위해 제거함. "같은 화면/같은 오류가 반복되는 정체 상태" 판단은 아직 미구현.

할 일 (시너지 작업 = 아래 전부):
- OCR `text_summary_redacted`/content_kind/classes → trigger context/signal 구조로 보존할지 결정
- OCR 반복성 반영 (예: 같은 오류/같은 화면 장시간 = "정체")
- OCR 반복 정체 후보 생성 조건 실측 튜닝
- 실제 macOS 권한 ON 상태에서 end-to-end smoke test

---

## P2 — 검증 / 연결 확인

### [ ] OCR → Trigger 파이프라인 end-to-end 검증

**현황:** OCR (`apple_vision.rs`) 실제 구현, Trigger scoring 실제 구현
**확인됨:** OCR 결과는 persist 가능한 trigger에서 `LlmInputEnvelope.redacted_ocr_summary`로 LLM 입력에 들어감.
**확인됨:** blocked OCR signal은 `apply_ocr_signal_to_evaluation()`에서 speakability score/action 보정에 사용됨.
**확인됨:** blocked OCR signal은 Work 단독 후보 생성에는 사용하지 않음. 기존 persist 가능한 후보의 score/context 보정으로만 사용함.
**확인됨:** Unknown OCR probe는 privacy-safe + 10분 + idle120초 조건에서만 수행되고, `work_document`/`code_error`만 DeepPause로 승격함.
**파일:** `src-tauri/src/trigger/commands/runner.rs`, `src-tauri/src/trigger/commands/persistence.rs`, `src-tauri/src/trigger/core/scoring.rs`, `src-tauri/src/ocr/core/`

할 일:
- macOS Screen Recording 권한 ON 상태에서 실제 자동 trigger smoke test
- OCR summary가 prompt 로그/LLM envelope에 들어가는지 runtime log로 확인
- OCR 반복 정체 후보 생성 조건과 실제 Nudge 빈도 튜닝

---

### [x] `modelRoute` 기본값 확인

**확인됨:** Rust `AppSettings::default().model_route`는 `api-first`.
**확인됨:** startup에서 settings 값을 읽어 `llm_state.set_route()`를 호출함.
**남은 문제:** 기본값이 아니라 provider 연결/배포/실호출 검증이 P0 범위.

---

### [ ] Paper 비주얼 리디자인 완료 여부 확인

MVP v2 plan Task 2 전부 `- [ ]`:
- floating icon left-bottom 이동
- paper/ink 스타일링
- 기술 레이블 (`Deep Context`, `local mock`) 제거
- NudgeNote input 없는 상태

직접 실행해서 현재 UI 확인 필요.

---

## P3 — MVP 이후

### [ ] Daily Care Note — 실제 데이터 연결

**현황:** `DailyCareNotePreview.tsx` 있음, `timelineEvents` prop 받음
**문제:** SQLite에서 오는지 mock인지 확인 필요
**범위:** Phase v3

---

## 빠른 판단 기준

**타겟 환경 (확정):** macOS only / 최소 PC = M1 Air 8GB / Local LLM = Qwen3-4B-GGUF Q4_K_M.

**지금 당장 데모 가능 최소 조건:**
1. `model_route = "api-first"` + `llm-generate` edge function 배포 → DeepChat 실제 LLM 응답
2. NudgeNote = template (LLM 없어도 뜸), 추후 Local Qwen으로 교체
3. Persona 3종 hardcoded 고정
4. Mate 4종 아이콘 분리 완료

**8GB 제약 주의:** Local Qwen 항상 상주 = swap 위험. 하이브리드(NudgeNote=local / DeepChat=api) + 모델 lazy load 필요. 우려2 항목 참조.

**"완성됐다"고 말하려면:**
1. P0 4개 해결
2. P1 Persona/Mate 분리 + 연결 결정
3. end-to-end smoke test 통과
