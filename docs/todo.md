# Amadeus — TODO

코드 분석 기반 실제 미완성 항목. 우선순위 순.

---

## P0 — 앱이 실제로 작동하려면 반드시 필요

### [ ] LLM 라우트 설정 (기본값이 Template)

**문제:** `LlmService::default()` → `route: LlmProviderRoute::Template`  
**파일:** `src-tauri/src/llm/core/service.rs:42`  
**결과:** NudgeNote / DeepChat 전부 hardcoded template 문자열 반환. LLM 없음.

할 일:
- `settings`에서 `model_route` 읽어 startup 시 `LlmState.set_route()` 호출하는 코드 확인/수정
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
- 페르소나 system prompt 조립 로직 edge function에서 동작하는지 검증

---

## P1 — 핵심 UX 연결

### [ ] 페르소나 소스 — Supabase pull을 UI에 연결

**문제:** `useCompanionShell` → `getPersonas(locale)` 호출 → i18n 파일의 hardcoded 7개만 표시  
**파일:** `src/features/companion/hooks/useCompanionShell.ts`, `src/domain/persona/registry.ts:9`  
**결과:** `pullCloudPersonas` 구현됐지만 shell에 미연결. 유저 커스텀 페르소나 반영 안 됨.

현재 카드 파일 있는 named persona 3종: `eiren-fantasy-guardian`, `makise-kurisu`, `seoyeon-modern-senior`

할 일:
- `useCompanionShell`에서 `pullCloudPersonas()` 결과를 merge하거나 replace하는 로직 추가
- 또는 MVP 범위 결정: 로컬 3종 고정 vs Supabase pull

---

### [ ] PocketChat 오프닝 메시지 — LLM 또는 더 자연스러운 생성 방식

**문제:** `pocketIntro.ts` → `nudge + POCKET_INTRO_SUFFIX[persona.id]` hardcoded concatenation  
**파일:** `src/features/companion/lib/pocketIntro.ts`  
**결과:** 페르소나별 1개 고정 문자열. 맥락 반영 없음.

할 일 (둘 중 선택):
- A) LLM으로 pocket intro 생성 (nudge 맥락 반영)
- B) 페르소나별 문장 pool 확대 (랜덤 선택) — MVP 빠른 방법

---

### [ ] 세션 영속성 — 인메모리 → SQLite

**문제:** `companionSessionStore.ts` → `createExternalStore` (인메모리)  
**결과:** 앱 재시작 / 윈도우 재로드 시 대화 기록 초기화

할 일:
- MVP에서는 인메모리도 허용 가능 (결정 필요)
- Phase v2 범위라면 SQLite `conversation_sessions` 테이블 연결

---

## P2 — 검증 / 연결 확인

### [ ] OCR → Trigger 파이프라인 end-to-end 검증

**현황:** OCR 코드 실제 구현됨 (`apple_vision.rs`), Trigger scoring 실제 구현됨  
**미확인:** OCR 결과가 실제로 trigger scoring input에 들어가는가  
**파일:** `src-tauri/src/trigger/core/scoring.rs`, `src-tauri/src/ocr/core/`

할 일:
- `llm_request_for_trigger()` 안에서 OCR observation 사용 여부 확인
- `capture_primary_display_ocr` → trigger로 이어지는 호출 체인 추적

---

### [ ] `modelRoute` 기본값 설정 확인

**파일:** `src/features/settings/` — `GeneralSettings` 타입의 `modelRoute` 기본값 확인  
**결과에 따라 P0 LLM 라우트 작업 범위 달라짐**

---

### [ ] Supabase 페르소나 pull 실제 동작 검증

**파일:** `src/features/persona/adapters/supabasePersonaRepository.ts`  
`pullCloudPersonas` 함수가 실제로 호출되는 진입점 확인 (어디서 call하는가?)

---

## P3 — MVP 이후

### [ ] Paper 비주얼 리디자인 완료 여부 확인

MVP v2 plan의 Task 2 (`- [ ]` 상태):
- floating icon left-bottom 이동
- paper/ink 스타일링
- 기술 레이블 (`Deep Context`, `local mock`) 제거
- NudgeNote input 없는 상태

현재 UI가 old 스타일인지 new 스타일인지 직접 실행해서 확인 필요.

---

### [ ] Daily Care Note — 실제 데이터 연결

**현황:** `DailyCareNotePreview.tsx` 파일 있음, `timelineEvents` prop 받음  
**문제:** mock 데이터인지 SQLite에서 오는지 확인 필요  
**범위:** Phase v3

---

## 페르소나 현황 정리

| ID | JSON 카드 | pocketIntro 문구 | i18n locale |
|---|---|---|---|
| `seoyeon-modern-senior` | ✅ | ✅ | 확인 필요 |
| `eiren-fantasy-guardian` | ✅ | ✅ | 확인 필요 |
| `makise-kurisu` | ✅ | ✅ | 확인 필요 |
| `warm_friend` | ❌ | ✅ | 확인 필요 |
| `loving_partner` | ❌ | ✅ | 확인 필요 |
| `steady_ally` | ❌ | ✅ | 확인 필요 |
| `soft_care` | ❌ | ✅ | 확인 필요 |

---

## 빠른 판단 기준

**지금 당장 데모 가능 조건:**
1. `model_route = "api-first"` 설정 + `llm-generate` edge function 배포됨 → DeepChat 실제 LLM 응답 가능
2. NudgeNote는 어차피 template (LLM 없이도 뜸)
3. 페르소나 3종 hardcoded로 고정

**"완성됐다"고 말하려면:**
1. P0 3개 해결
2. P1 페르소나 연결 결정
3. end-to-end smoke test 통과
