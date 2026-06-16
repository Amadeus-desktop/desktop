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

**현재 문제:** `src/domain/persona/types.ts`의 `PERSONA_IDS`에 7개(`warm_friend`, `loving_partner`, `steady_ally`, `soft_care` 포함)가 들어 있음. 제네릭 4종은 Mate 개념으로 분리하거나 제거해야 함.

---

## P0 — 앱이 실제로 작동하려면 반드시 필요

### [ ] 제네릭 Persona 4종 제거 — Persona/Mate 분리

**문제:** `PERSONA_IDS`에 `warm_friend`, `loving_partner`, `steady_ally`, `soft_care` 포함  
**파일:** `src/domain/persona/types.ts`, `src/domain/persona/registry.ts`  
**결과:** Persona 선택 UI에 실체 없는 캐릭터가 노출됨. JSON 카드, system prompt 없음.

할 일:
- `PERSONA_IDS`를 named 3종으로만 축소
- `warm_friend` 등 4종을 Mate 타입으로 분리 (별도 `MateId` 타입)
- `PRESENCE_ICON_BY_PERSONA`를 Persona 3종 + Mate 4종으로 각각 재정의
- `pocketIntro.ts` — named 3종 suffix만 유지, 제네릭 4종 항목 제거
- `LEGACY_PERSONA_MAP` 리매핑 정리

---

### [ ] LLM 라우트 설정 (기본값이 Template)

**문제:** `LlmService::default()` → `route: LlmProviderRoute::Template`  
**파일:** `src-tauri/src/llm/core/service.rs:42`  
**결과:** NudgeNote / DeepChat 전부 hardcoded template 문자열 반환. LLM 없음.

할 일:
- `settings`에서 `model_route` 읽어 startup 시 `LlmState.set_route()` 호출 확인/수정
- 기본값을 `api-first` 또는 `local-first`로 변경
- Supabase Edge Function `llm-generate` 배포 여부 확인

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

**문제:** `llmRepository.ts:43` → `supabase.functions.invoke("llm-generate")` 호출하는데 배포 여부 미확인  
**결과:** `api-first` 라우트 설정해도 edge function 없으면 실패 → Template fallback

할 일:
- `supabase/functions/llm-generate/` 존재 확인
- 배포 상태 확인 (`supabase functions list`)
- 페르소나 system prompt 조립 로직이 edge function에서 동작하는지 검증

---

## P1 — 핵심 UX 연결

### [ ] 페르소나 소스 — Supabase pull을 UI에 연결

**문제:** `useCompanionShell` → `getPersonas(locale)` → i18n hardcoded 값만 표시  
**파일:** `src/features/companion/hooks/useCompanionShell.ts`, `src/domain/persona/registry.ts:9`  
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

**근거:** `src-tauri/src/llm/prompt/persona.rs` `persona_summary()` → LLM에 넘기는 persona = 닉네임 한 줄("OO 곁의 조용한 companion")뿐. 캐릭터 말투/세계관/system prompt 없음.
**근거:** `src-tauri/src/trigger/core/scoring.rs` `llm_request_for_trigger()` → `safe_memory_summary: None`, `redacted_ocr_summary: None`. JSON 카드의 `static_prompt_json`이 envelope에 안 실림.

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

### [ ] 우려6: OCR + 화면녹화 시너지 → 가장 큰 갭. 현재 OCR이 trigger에 전혀 안 쓰임

**현재 "작업 인지" 실제 방식** (`src-tauri/src/macos_context/core/native_macos.rs`):
- 어떤 앱: `NSWorkspace.frontmostApplication()`
- 창 제목: `copy_window_info` (CGWindow API)
- 멈춤 시간: `CGEventSourceSecondsSinceLastEventType` (키/마우스 idle)
- 앱 지속 시간: `Instant::elapsed()`
- 작업/비작업: `classify_app(bundle_id)`

**현재 트리거 규칙** (`scoring.rs select_candidate`): DeepPause(Work+10분+idle120초↑) / Milestone(Work+60분+idle600초미만) / Drift(NonWork+10분↑). → **전부 앱종류 + idle 시간 기반. 화면 내용(OCR) 0.**

**근거:** `TriggerInput`에 OCR 필드 없음(`types.rs`), `scoring.rs`는 `redacted_ocr_summary: None`. OCR 명령(`capture_primary_display_ocr`)은 별도 수동 경로, trigger와 미연결.

**결론:** PRD가 말한 "OCR로 화면 보고 맥락 파악" = 미구현. 지금은 화면 내용을 못 봄. 앱 이름 + 멈춤만 앎.

할 일 (시너지 작업 = 아래 전부):
- `capture_primary_display_ocr`를 trigger 폴링 주기에 연결 (gate 통과 시에만)
- OCR `text_summary_redacted` → `TriggerInput`에 필드 추가
- scoring에 OCR 맥락 반영 (예: 동일 에러 텍스트 반복 = "막힘" 감지, 같은 화면 장시간 = "정체")
- OCR 요약 → `LlmInputEnvelope.redacted_ocr_summary` 주입 → NudgeNote가 화면 맥락 반영
- privacy gate(`pre_capture_gate`/`pre_ocr_gate`) 통과분만 사용
- 성능: OCR 매 폴링마다 돌리면 비싸다 → idle/정체 의심 시에만 캡처하는 조건부 트리거

---

## P2 — 검증 / 연결 확인

### [ ] OCR → Trigger 파이프라인 end-to-end 검증

**현황:** OCR (`apple_vision.rs`) 실제 구현, Trigger scoring 실제 구현  
**미확인:** OCR 결과가 trigger scoring input에 실제로 들어가는가  
**파일:** `src-tauri/src/trigger/core/scoring.rs`, `src-tauri/src/ocr/core/`

할 일:
- `llm_request_for_trigger()` 안에서 OCR observation 사용 여부 확인
- `capture_primary_display_ocr` → trigger 호출 체인 추적

---

### [ ] `modelRoute` 기본값 확인

**파일:** `src/features/settings/` — `GeneralSettings.modelRoute` 기본값  
결과에 따라 P0 LLM 라우트 작업 범위 달라짐.

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
