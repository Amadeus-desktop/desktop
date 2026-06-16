# 트리거 시나리오 검증 (코드 대조)

현재 코드(`scoring.rs`, `history.rs`, `classifier.rs`, `engine.rs`, `native_macos.rs`) 기준 25개 시나리오 지원 여부.

범례: ✅ 지원 / ⚠️ 부분(의도 안 맞음) / ❌ 미지원 / 🐛 버그성 동작

---

## 기준 로직 요약

**카테고리** (`classifier.rs`)
- Work: vscode/xcode/cursor/intellij/zed/terminal/iterm/한글/hwp/pages/notion/slack/figma/discord/jira/github/gitlab/stack overflow/confluence/linear/google docs/sheets/slides
- NonWork: youtube/netflix/twitch/disney/spotify/instagram/twitter/x.com
- Unknown: 나머지 전부 (일반 Safari/Chrome, Mail, Obsidian, 카톡 등)
- 브라우저는 bundle만으로 판단하지 않고 `app_name + window_title`에 들어온 키워드로 Work/NonWork를 판정한다.

**후보 생성** (`select_candidate`)
- DeepPause: Work + 같은앱 ≥10분 + idle ≥120초 → 72 Bubble
- WorkCluster DeepPause: Work + 최근 work_cluster≥10분 + app switch≥3 + idle ≥120초 → 72 Bubble
- Milestone: Work + 같은앱 또는 연속 Work session ≥60분 + idle <600초 → 82 Conversation
- Drift: NonWork + 같은앱 ≥10분 → 64 Bubble
- Unknown Work-like OCR DeepPause: Unknown + 같은앱 ≥10분 + idle ≥120초 + privacy-safe OCR class가 `work_document`/`code_error` → 72 Bubble
- **Unknown 카테고리 → 기본 침묵. 단 Work-like OCR class일 때만 보수적으로 DeepPause 승격**

**OCR 후보** (`select_ocr_candidate`): Work + blocked 키워드 → 72, 보정 +8 = 80 Conversation

**억제** (`exception_suppression`, history 필요)
- meeting app frontmost → `meeting`
- music app frontmost + NonWork + <60초 → `music_short_foreground`
- NonWork + work_cluster≥10분 + app_switch≥3 + nonwork_single_max<10분 → `work_cluster`
- NonWork + fullscreen → `fullscreen_non_work`
- Work + 60분 Milestone 조건 + idle<5초 → `active_input_guard`
- Work/Unknown + idle>600초 → `away_idle`

**게이트**: proactive_disabled / privacy / daily_limit / cooldown
**same-app 재발동 차단**: 발화가 저장된 앱 bundle에서는 앱을 떠날 때까지 추가 발화 억제

**함정**: `frontmost_duration_ms`는 앱 전환 시 0으로 리셋된다. DeepPause는 `work_cluster_duration_ms`, Milestone은 runtime의 `work_session_duration_ms` fallback을 사용한다.

---

## Unknown 처리 원칙

Unknown은 기본적으로 침묵한다. 모르는 앱/사이트는 작업일 수도 있고 소비일 수도 있으므로, Work/NonWork로 억지 분류하지 않는다.

이 정책은 의도된 안전 기본값이다. 작업을 NonWork로 오인해 "쉬는 중" 메시지를 띄우는 비용이, 소비 활동을 놓치는 비용보다 크다. 또한 아마데우스의 제품 원칙은 사용자를 평가하거나 감시하는 것이 아니라 조용히 맥락을 목격하는 것이다.

롱테일 서비스는 키워드 추격 대상이 아니다. tvwiki, niconico, Zeta, LoveyDovey, 신생 AI chat 서비스처럼 새로 생기거나 용도가 애매한 서비스는 키워드 whitelist/blacklist로 따라가지 않는다.

특히 Zeta/LoveyDovey 같은 AI chat/companion 서비스는 NonWork로 분류하지 않는다. 경쟁 companion을 쓰는 상황에서 잔소리성 Drift를 띄우는 것은 제품 경험상 최악에 가깝기 때문에 기본 Unknown 침묵이 맞다.

향후 Unknown 판정이 필요할 때는 "이게 무슨 앱인가"가 아니라 "사용자가 지금 무엇을 하고 있는가"를 본다.

| 신호 | 작업 가능성 | 소비/시청 가능성 | 게임 가능성 |
|---|---|---|---|
| 키보드 입력 빈도 | 높음 | 낮음 | 높음 |
| 마우스/스크롤 중심 | 중간 | 높음 | 낮음 |
| idle 패턴 | 입력과 멈춤 반복 | 긴 시청 구간 | 거의 0 또는 반복 조작 |
| 풀스크린 | 낮음 | 높음 | 높음 |
| OCR redacted summary | 코드/문서/오류 단서 | 플레이어 UI/댓글/다음 화 단서 | 게임 UI 단서 |

현재 코드에는 `idle_seconds`와 `is_fullscreen`만 있다. 키보드/마우스/스크롤 rate와 idle 변화 window는 아직 없다. 따라서 Unknown 행동 판정은 아직 제한적이다.

OCR/스크린 확인은 Unknown을 무조건 분류하기 위한 도구가 아니다. 현재 코드는 privacy-safe하고 Unknown이 10분 이상 지속되며 idle 120초 이상인 경우에만 OCR probe를 수행하고, raw text가 아니라 `redacted_ocr_context_class`만 trigger 판단에 사용한다.

| OCR class | 정책 |
|---|---|
| `work_document` / `code_error` | Work-like DeepPause 승격 가능 |
| `video_player` / `game` | 침묵 또는 observe-only |
| `ai_chat_companion` | 침묵, NonWork Drift 금지 |
| `private_chat` | 침묵 |
| `unknown` | 침묵 |

즉 OCR은 우선 "말 걸기" 도구가 아니라 오발화를 막는 안전장치다.

---

## 시나리오 표

| # | 시나리오 | 현재 동작 | 상태 | 문제/비고 |
|---|---|---|---|---|
| 1 | 작업앱 10분+ 후 idle 120초 (자리 비움) | DeepPause Bubble 발동 | ⚠️ | idle=자리비움인지 화면읽기인지 구분 못 함. 문서 읽는 중에도 발동 |
| 2 | 작업하다 유튜브 실행 | 전환 시 타이머 리셋 → 유튜브 10분 지나야 Drift | ⚠️ | "방금 딴짓 시작"은 감지 못 함. 10분 후에야 반응 |
| 3 | 창 왔다갔다(IDE↔터미널↔브라우저) 작업 | work_cluster≥10분 + switch≥3 + idle≥120초면 DeepPause, 연속 Work session≥60분이면 Milestone | ✅ | 단 browser가 Unknown으로 분류되면 Work session은 끊김 |
| 4 | 음악(Spotify) 백그라운드 + 작업 | 음악은 frontmost 아님 → 작업앱 기준 정상 발동 | ✅ | 음악 백그라운드는 영향 없음. 정상 |
| 5 | 작업앱 60분 이상 지속 | Milestone Conversation 발동 | ✅ | 같은 앱 60분 또는 Work 앱들 사이 연속 session 60분 모두 가능 |
| 6 | 작업 중 화면에 에러 메시지 뜸(5분+idle 60초+) | OCR blocked → DeepPause 80 Conversation | ✅ | 단 1회 키워드로 발동. false positive 위험(에러 이미 해결 중) |
| 7 | 줌/팀즈 회의 중 | meeting 억제 | ✅ | history 있을 때만. history 없으면 `is_known_meeting_app`로 fallback ✅ |
| 8 | 잠깐 Spotify 열어서 곡 바꿈(60초 미만) | music_short_foreground 억제 | ✅ | 짧은 음악 조작은 침묵 |
| 9 | 딴짓하며 작업앱 사이 짧게 비작업 끼임(3회+) | work_cluster 억제 | ✅ | 단 history 필요. NonWork 단일 10분 미만일 때만 |
| 10 | Safari로 문서/스택오버플로 검색하며 작업 | title에 docs/github/stackoverflow 등 Work 키워드가 있으면 Work | ⚠️ | 키워드 기반이라 일반 Safari 업무 페이지는 아직 Unknown 가능 |
| 11 | Chrome으로 업무(Notion 웹/Docs/Jira) | title 기반 Work 판정. YouTube/Netflix 등은 NonWork 유지 | ✅ | `com.google.chrome` 전체 NonWork 오분류 제거 |
| 12 | Figma/Slack/Discord로 작업 | Work로 분류되어 DeepPause/Milestone 후보 가능 | ⚠️ | Discord는 개인 사용도 많아 MVP 정책 선택. 추후 workspace/server 맥락 필요 |
| 13 | 풀스크린 영상 시청 중 | NonWork + fullscreen이면 `fullscreen_non_work`로 억제 | ✅ | 메인 디스플레이 bounds 기반 heuristic이라 멀티 디스플레이/특수 플레이어는 실측 필요 |
| 14 | 게임 실행(Steam 등) | 게임=Unknown → 침묵 | ❌ | 게임 카테고리 없음. Drift도 안 됨 |
| 15 | 발표/화면공유 중 | 화면공유 감지 없음(zoom이면 meeting으로 우연히 억제) | ⚠️ | Keynote 단독 발표는 Unknown → 침묵(운좋게), 의도된 게 아님 |
| 16 | 같은 앱에서 발화 직후 같은 멈춤 반복 | 같은 bundle이면 `repeated_app_utterance`로 침묵 | ✅ | 앱을 떠나 다른 bundle로 이동하면 차단 해제 |
| 17 | 하루 종일 작업, 발화 누적 | daily_limit 게이트 | ✅ | talk_frequency 일일 제한 |
| 18 | 방금 발화 후 곧바로 또 | cooldown 게이트 | ✅ | talk_frequency cooldown |
| 19 | 새벽/집중시간대 작업 | 시간대 구분 없음 | ❌ | 심야/집중모드 침묵 옵션 없음 |
| 20 | 작업 풀려서 빠르게 타이핑 중(몰입) | idle<5초이면 Milestone도 `active_input_guard`로 억제 | ⚠️ | 실제 키보드 density가 아니라 idle 기반 근사라, 느린 입력/마우스 작업은 아직 미세 조정 필요 |
| 21 | 민감 앱(은행/비밀번호/시크릿창) | privacy 게이트(should_suppress) | ✅ | privacy assessment 의존. 키워드 커버리지가 관건 |
| 22 | 회의 끝나고 바로 작업 복귀 | meeting 풀리고 작업앱 10분+idle → DeepPause | ✅ | 정상 전환 |
| 23 | 짧게 여러 작업앱 옮기다 한 곳 정착 10분+ | 정착 앱에서 frontmost 누적 10분 → 발동 | ✅ | 정착 후엔 정상 |
| 24 | idle 매우 길게(자리 30분 비움) | `away_idle`로 발화/OCR probe 억제 | ✅ | 10분 초과 idle은 부재로 보고 보류 |
| 25 | 같은 에러 화면 20분째 유지(진짜 막힘) | OCR 1회 신호만 봄, 반복/지속 미인지 | ❌ | 히스토리 기반 "진짜 막힘" 판정 없음(알려진 한계) |
| 26 | tvwiki/niconico/신생 영상 사이트 | Unknown이면 침묵 | ✅ | 키워드 추격 금지. 행동층/풀스크린 신호 전까지 침묵이 안전 기본값 |
| 27 | Zeta/LoveyDovey 같은 AI chat/companion | Unknown이면 침묵 | ✅ | NonWork 잔소리 금지. 경쟁 companion 사용 중 개입하지 않음 |

---

## 집계

| 상태 | 개수 | 시나리오 |
|---|---|---|
| ✅ 지원 | 18 | 3,4,5,6,7,8,9,11,13,16,17,18,21,22,23,24,26,27 |
| ⚠️ 부분 | 6 | 1,2,10,12,15,20 |
| 🐛 버그성 | 0 | - |
| ❌ 미지원 | 3 | 14,19,25 (+6 false positive 위험) |

---

## 가장 시급한 구멍 (1일 마감 기준 우선순위)

### ✅ 1. 멀티태스킹 작업 장기 세션 (#3)
`frontmost_duration_ms`가 앱 전환마다 리셋되는 문제는 DeepPause의 `work_cluster_duration_ms`, Milestone의 `work_session_duration_ms` fallback으로 보강했다.
**남은 주의:** Unknown/NonWork로 분류되는 앱에 오래 머물면 Work session은 끊긴다.

### ⚠️ 2. 브라우저/협업앱 분류 정확도 (#10,12)
- Chrome 전체 NonWork 오분류는 제거됨.
- Safari/Chrome은 title 키워드 기반이라 일반 업무 페이지는 Unknown 가능.
- Slack/Figma/Discord는 Work로 보강됨. 단 Discord는 개인 사용과 업무 사용 구분이 아직 없다.
**남은 수정:** URL/domain 또는 브라우저 탭 메타데이터 기반 분류, Discord workspace 맥락 분리.

### ⚠️ 3. 행동 신호 부재 (#1,20,26,27)
입력 없음을 "쉼"으로 단정하는 문제는 아직 남아 있다. 풀스크린 NonWork 억제, idle<5초 Milestone guard, idle>600초 부재 보류는 들어갔지만, 읽기/느린 입력/마우스 중심 작업 구분은 아직 부족하다.
Unknown을 키워드로 더 분류하지 않고, 키보드/마우스/스크롤/OCR redacted class 기반의 행동층을 추가해야 한다.
**수정:** Behavior Signal Layer 추가.

### ✅ 4. 같은 앱 재발동 차단 (#16)
발화가 저장된 앱 bundle에서는 앱을 떠날 때까지 `repeated_app_utterance`로 억제한다.

### ⚠️ 5. OCR 1회 키워드 false positive (#6,25)
OCR 후보 메시지는 화면을 봤다는 표현을 제거했다. 다만 1회 키워드만으로 blocked 상태를 판단하는 한계는 남아 있다.
**수정:** 1회는 관찰만, 2회+ 확인 시 발동(히스토리 필요, 1일엔 무거우면 후순위)

---

## 1일 안에 넣을 최소 3개 (효과/난이도순)

1. **classifier 보강** (#10,11,12) — 완료. 브라우저 title 판정 + Slack/Figma/Discord Work화.
2. **frontmost → work_cluster/work_session 기준 전환** (#3) — DeepPause와 Milestone 모두 완료.
3. **OCR 반복성 + 입력밀도 몰입가드** (#5,#3-flow) — 일부 완료. idle<5초 Milestone guard와 Unknown Work-like OCR 승격은 구현됨. 동일 화면 히스토리와 실제 입력 이벤트 데이터는 남음.

나머지(시간대, OCR 히스토리, 입력/마우스/스크롤 행동 신호)는 마감 후.
