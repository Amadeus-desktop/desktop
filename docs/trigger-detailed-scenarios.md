# 트리거 상세 시나리오 (타임라인 기반)

현재 코드 정책 그대로. 실제 앱 + 시간 흐름 + 발동/침묵 판정 + 근거.

판정: 🔔 발동 / 🔕 침묵
근거 코드: `scoring.rs` `select_candidate`/`apply_ocr_signal_to_evaluation`/`exception_suppression`, `classifier.rs`, `history.rs`

---

## 발동 3조건 (다 충족해야 울림)

1. **카테고리** = Work 또는 NonWork. Unknown은 기본 침묵이고, privacy-safe OCR class가 Work-like일 때만 예외적으로 DeepPause 가능
2. **시간** = 같은앱, work_cluster, 또는 work_session 충분히 오래 (10분/60분)
3. **상태** = idle(멈춤). OCR 막힘 신호는 단독 발동 조건이 아니라 기존 후보의 보정 신호다.

그 위에 게이트(meeting/music/privacy/cooldown/daily_limit/proactive)가 하나라도 걸리면 침묵.
발화가 저장된 앱 bundle에서는 앱을 떠날 때까지 `repeated_app_utterance`로 추가 발화를 억제한다.

현재 코드에서 OCR은 기존 Work trigger 후보가 persist 가능할 때 후속 보정/context로 사용되거나, 일부 Unknown 카테고리에서 Work-like 여부를 확인할 때만 수행된다. Unknown은 키워드로 Work/NonWork를 억지 분류하지 않고, privacy-safe하고 개입 후보성이 있을 때만 OCR/스크린 확인으로 `redacted_ocr_context_class`를 만든다. 이 class는 주로 오발화 방지와 Work-like 승격에 쓰고, NonWork 잔소리 승격에는 쓰지 않는다.

```
Unknown
  → 기본 침묵
  → privacy safe + 10분 지속 + idle 120초 이상일 때만 OCR probe
  → raw text 저장/전달 금지, redacted context class만 사용
  → work_document/code_error면 DeepPause 후보 가능
  → video_player/game/ai_chat_companion/private_chat/unknown이면 침묵
```

---

## A. 작업 → 멈춤 계열

### A-1. VSCode 코딩하다 잠깐 멈춤 🔔
```
00:00  VSCode 열고 코딩 시작
00:10  계속 같은 VSCode (frontmost 10분 누적)
00:12  입력 없음 120초 경과 (120초 ≤ idle ≤ 600초)
→ DeepPause Bubble (72)
   "잠깐 멈춘 것 같아서. 말 안 해도 괜찮아."
```
근거: Work + frontmost≥10분 + 120초≤idle≤600초

### A-1b. VSCode 켜둔 채 30분 자리 비움 🔕
```
00:00  VSCode 열고 코딩 시작
00:10  계속 같은 VSCode (frontmost 10분 누적)
00:40  자리 비움으로 idle 30분 경과 (idle >600초)
→ 침묵 (`away_idle`)
→ OCR probe도 수행하지 않음
```
근거: Work/Unknown + idle>600초는 부재로 보고 보류

### A-2. VSCode 코딩 중 5분만에 잠깐 멈춤 🔕
```
00:00  VSCode 시작
00:05  생각하느라 130초 멈춤 (idle ≥120 OK)
→ 침묵 (frontmost 5분 < 10분)
```
근거: 시간 조건 미달. 충분히 오래 안 함

### A-3. 코딩 중 활발히 타이핑 (몰입) 🔕
```
00:00  VSCode 시작
00:15  계속 빠르게 타이핑, idle 한 번도 120초 안 넘음
→ 침묵 (idle 조건 미달)
```
근거: DeepPause는 idle≥120 필요. 활발한 입력 = 안 울림 (몰입 보호, 우연이지만 맞는 동작)

### A-3b. 60분 넘게 작업 중인데 계속 타이핑 🔕
```
00:00  VSCode 시작
01:00  같은 앱 또는 Work session 60분 누적
01:00  idle <5초로 계속 입력 중
→ 침묵 (`active_input_guard`)
```
근거: Milestone 조건이 맞아도 idle<5초이면 몰입 중으로 보고 억제. 단 실제 keyboard density가 아니라 idle 기반 근사다.

### A-4. 한글(HWP)로 과제 60분 이상 지속 🔔
```
00:00  한글 열고 리포트 작성
01:00  같은 한글 60분 누적, 여전히 작업 중(idle<600)
→ Milestone Conversation (82)
   "조용히 오래 해내고 있었네."
```
근거: Work + frontmost≥60분 + idle<600초

---

## B. 멀티태스킹 작업 계열

### B-1. IDE ↔ 터미널 ↔ Notion 오가며 개발 🔔
```
00:00  VSCode (4분) → 터미널 (3분) → VSCode (2분) → Notion (3분)
00:12  work_cluster 누적 ≥10분, 앱전환 ≥3회
00:14  잠깐 멈춤 idle ≥120초
→ DeepPause Bubble (72)  [work_cluster fallback]
```
근거: Work + work_cluster≥10분 + app_switch≥3 + idle≥120초

### B-2. 같은 멀티태스킹인데 안 멈추고 계속 작업 🔕
```
00:00~00:20  IDE↔터미널↔Notion 활발히 전환하며 작업, idle 안 쌓임
→ 침묵 (idle 조건 미달)
```
근거: work_cluster fallback도 idle≥120 필요

### B-3. 멀티태스킹 작업 2시간 (Milestone) 🔔
```
00:00~02:00  여러 작업앱 계속 전환하며 작업
01:00  연속 Work session 60분 누적, idle<600
→ Milestone Conversation (82)
```
근거: Work + work_session≥60분 + idle<600초. 단 Unknown/NonWork 앱으로 나가면 Work session은 끊김

---

## C. 작업 → 딴짓 전환 계열

### C-1. 코딩하다 유튜브 켬 🔔(지연)
```
00:00  VSCode 작업
00:30  유튜브(NonWork) 열고 시청 시작 → frontmost 리셋 0
00:40  유튜브 같은 탭 10분 누적
→ Drift Bubble (64)
   "쉬는 중이면 괜찮아. 돌아가고 싶어지면 내가 옆에 있을게."
```
근거: NonWork + frontmost≥10분. **단 "방금 켰을 때"는 감지 못 함, 10분 후 반응**

### C-1b. 풀스크린 유튜브/넷플릭스 시청 🔕
```
00:30  YouTube/Netflix 같은 NonWork 앱 또는 탭
00:40  10분 이상 지속, 화면이 fullscreen bounds로 감지됨
→ 침묵 (`fullscreen_non_work`)
```
근거: NonWork + fullscreen은 Drift보다 먼저 억제한다. 현재 fullscreen 판단은 메인 디스플레이 window bounds overlap 기반 heuristic이라 멀티 디스플레이/특수 플레이어는 실측 필요.

### C-2. 유튜브 2분만 보고 작업 복귀 🔕
```
00:30  유튜브 2분 시청
00:32  VSCode 복귀
→ 침묵 (유튜브 frontmost 2분 < 10분)
```
근거: NonWork 시간 조건 미달. 짧은 환기는 안 건드림

### C-3. 작업 중간중간 유튜브 짧게 여러 번 🔕
```
VSCode(5분) → 유튜브(3분) → VSCode(5분) → 유튜브(2분) → ...
work_cluster≥10분 + 전환≥3 + 각 비작업 10분 미만
→ work_cluster 억제
```
근거: `suppress_work_cluster_drift`. 딴짓이 짧게 끼는 건 작업 흐름으로 봄

---

## D. 음악 계열

### D-1. Spotify 백그라운드 틀고 VSCode 작업 🔔가능
```
Spotify는 백그라운드(frontmost 아님), VSCode가 frontmost
→ VSCode가 Work 조건을 만족하면 정상 판정 (A-1과 동일)
```
근거: frontmost만 봄. 백그라운드 음악은 직접 발동/억제 조건이 아님

### D-2. Spotify 열어서 곡 바꾸고 30초만에 복귀 🔕
```
00:30  Spotify foreground 30초 (곡 변경)
→ music_short_foreground 억제
```
근거: music app + NonWork + frontmost<60초

### D-3. Spotify 열어놓고 10분간 플레이리스트 구경 🔔
```
00:30  Spotify foreground 10분 (계속 뒤적임)
→ Drift Bubble (64)
```
근거: 60초 넘으면 music 억제 안 됨 → NonWork Drift로 처리. (논란 여지: 음악 고르는 것도 "쉼"으로 봄)

---

## E. 회의/발표 계열

### E-1. Zoom 회의 중 🔕
```
Zoom frontmost
→ meeting 억제
```
근거: `is_known_meeting_app` (zoom/meet/teams/webex)

### E-2. 회의 끝나고 VSCode 복귀 🔔
```
01:00  Zoom 종료, VSCode 복귀
01:10  VSCode 10분 + idle 120초
→ DeepPause Bubble (정상 복귀)
```
근거: meeting 풀리고 Work 조건 충족

### E-3. Keynote로 발표 연습 🔕 ⚠️
```
Keynote frontmost
→ 침묵 (Keynote = Unknown)
```
근거: Unknown이라 우연히 침묵. **발표 감지 의도 아님** (운좋은 침묵)

---

## F. Unknown/롱테일 계열

### F-1. tvwiki에서 애니 시청 🔕
```
tvwiki(브라우저 title) → 키워드 없음 → Unknown
→ 침묵
```
근거: Unknown 후보 없음. **키워드 추격 안 함**

### F-2. niconico / 러비더비 / Zeta(AI챗) 🔕
```
현재 명시 키워드가 없으면 Unknown → 침묵
```
근거: 정체 추격 거부. 특히 AI companion 쓰는 중 개입 = 최악 → 침묵 맞음. 단 브라우저 title에 기존 Work/NonWork 키워드가 섞이면 classifier 결과가 달라질 수 있음

### F-3. Steam으로 게임 🔕
```
게임 = Unknown → 침묵
```
근거: 게임 카테고리 없음. **개입 안 하는 게 안전**

### F-4. Safari로 일반 웹서핑/업무 🔕
```
Safari 일반 페이지 = title에 work/nonwork 키워드 없으면 Unknown
→ 침묵
```
근거: 키워드 없으면 Unknown. 업무 페이지도 놓칠 수 있음(보수적)

### F-5. 카톡/디스코드 잡담 🔕(카톡), 🔔가능(디스코드)
```
카톡 = Unknown → 침묵
디스코드 = Work 분류됨 → 10분+idle이면 DeepPause 가능
```
근거: 디스코드는 현재 Work로 들어감. **개인 사용도 Work로 봄 (정책 선택)**

### F-6. Unknown이지만 OCR이 Work-like 화면으로 확인한 경우 🔔가능
```
Unknown 앱/사이트가 오래 지속되고 idle이 생김
privacy gate 통과
OCR redacted context class = work_document 또는 code_error
→ DeepPause Bubble (72)
```
근거: Unknown을 키워드로 Work/NonWork 분류하지 않고, 화면 확인 결과를 `work_document`, `code_error`, `video_player`, `ai_chat_companion`, `private_chat`, `game`, `unknown` 같은 class로만 사용한다. 승격은 `work_document`/`code_error`만 허용한다. 단 idle>600초이면 `away_idle`로 보류하고 OCR probe도 하지 않는다.

### F-7. Unknown + 영상/게임/AI companion OCR class 🔕
```
Unknown 앱/사이트가 오래 지속되고 idle이 생김
OCR class = video_player / game / ai_chat_companion / private_chat / unknown
→ 침묵
```
근거: OCR class는 NonWork Drift를 만들지 않는다. 소비/게임/AI companion/개인 대화는 observe-only 또는 침묵이다.

---

## G. OCR 막힘 계열

### G-1. VSCode에서 컴파일 에러 30초째 응시 🔕
```
00:00  VSCode 작업
00:05  같은 앱 5분, idle 70초
       화면 OCR: "compile error: cannot resolve module"
→ 침묵
```
근거: OCR blocked 키워드만으로는 단독 후보를 만들지 않는다. 1회 키워드 false positive를 막기 위한 정책이다.

### G-1b. 이미 DeepPause 후보가 있는 상태에서 에러 OCR이 붙음 🔔
```
00:00  VSCode 작업
00:12  같은 앱 12분, idle 180초
       화면 OCR: "compile error: cannot resolve module"
→ 기존 DeepPause 후보 + OCR blocked 보정
→ DeepPause Conversation (72+8=80)
```
근거: 기존 trigger 후보가 persist 가능한 경우에만 OCR blocked 신호를 +8 보정과 LLM context로 사용한다.

### G-2. 에러 이미 해결하고 다음 작업 중인데 에러 텍스트 남아있음 🔕
```
화면에 이전 에러 메시지 아직 떠있음 (이미 해결함)
작업 5분, idle 70초처럼 기본 trigger 후보는 없음
→ 침묵
```
근거: 1회 키워드만으로는 단독 발화하지 않는다. 단, 같은 화면이 반복되는 진짜 막힘 판정은 아직 없다.

### G-3. 그냥 문서에 "에러 처리 방법" 적는 중 🔕
```
Notion에 "에러 핸들링 가이드" 작성 중
화면 OCR에 "에러" 단어 → blocked 오인
기본 trigger 후보가 없으면 침묵
```
근거: OCR blocked는 단독 후보가 아니라 보정 신호다.
근거: 키워드 단순 매칭. 맥락 구분 없음. **false positive 위험**

---

## H. 재발동 차단 계열

### H-1. VSCode에서 방금 발화 후 같은 앱에서 다시 멈춤 🔕
```
00:10  VSCode DeepPause 발화 저장
00:14  여전히 VSCode, 다시 idle 조건 충족
→ 침묵 (`repeated_app_utterance`)
```
근거: 마지막 발화 bundle과 현재 frontmost bundle이 같으면 앱을 떠날 때까지 억제

### H-2. VSCode 발화 후 Terminal로 이동 🔔가능
```
00:10  VSCode DeepPause 발화 저장
00:12  Terminal로 이동
00:24  Terminal에서 Work 조건 충족
→ 발동 가능
```
근거: bundle이 바뀌면 same-app 재발동 차단은 해제됨. 단 cooldown/daily/privacy 등 다른 gate는 여전히 적용

---

## 발동/침묵 빠른 표

| 상황 | 판정 | 이유 |
|---|---|---|
| 작업앱 10분+멈춤 | 🔔 | DeepPause |
| 작업앱 5분+멈춤 | 🔕 | 시간 부족 |
| 작업앱 타이핑 중 | 🔕 | idle 부족 |
| 작업앱/Work session 60분 지속 | 🔔 | Milestone |
| 작업앱/Work session 60분+인데 idle<5초 | 🔕 | active_input_guard |
| 멀티태스킹 10분+멈춤 | 🔔 | work_cluster |
| 멀티태스킹 Work session 60분+ | 🔔 | Milestone |
| 유튜브 10분+ | 🔔 | Drift(지연) |
| NonWork 풀스크린 10분+ | 🔕 | fullscreen_non_work |
| 유튜브 2분 | 🔕 | 시간 부족 |
| 음악 백그라운드 | 🔔가능 | frontmost 작업앱 조건을 만족할 때만 |
| 음악 60초 미만 조작 | 🔕 | music 억제 |
| 회의 중 | 🔕 | meeting 억제 |
| 민감앱 | 🔕 | privacy |
| 쿨다운/한도 | 🔕 | 게이트 |
| 같은 앱 발화 후 같은 앱 반복 | 🔕 | repeated_app_utterance |
| tvwiki/니코니코/Zeta/게임/Safari일반 | 🔕 | Unknown |
| 디스코드 10분+멈춤 | 🔔 | Work 분류됨 |
| OCR 에러 키워드 | 🔔 | 단 false positive 위험 |
| Unknown + Work-like OCR class | 🔔가능 | privacy-safe + 10분 + idle120초 |
| Unknown + 영상/게임/AI/개인채팅 OCR class | 🔕 | Drift 승격 금지 |

---

## 핵심 한 문장

> **확실히 작업앱(또는 영상앱)에서, 충분히 오래, 멈췄을 때만 운다. 모르는 건 안 운다. 애매하면 침묵.**

⚠️ 표시 = 알려진 false positive / 갭. 마감 후 우선 수정 대상:
- G-2,G-3: OCR 1회 키워드 false positive
- 실제 키보드/마우스/스크롤 rate 기반 행동 신호 미구현
