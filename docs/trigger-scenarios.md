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
- Milestone: Work + 같은앱 ≥60분 + idle <600초 → 82 Conversation
- Drift: NonWork + 같은앱 ≥10분 → 64 Bubble
- **Unknown 카테고리 → 후보 없음 (항상 침묵)**

**OCR 후보** (`select_ocr_candidate`): Work + blocked 키워드 → 72, 보정 +8 = 80 Conversation

**억제** (`exception_suppression`, history 필요)
- meeting app frontmost → `meeting`
- music app frontmost + NonWork + <60초 → `music_short_foreground`
- NonWork + work_cluster≥10분 + app_switch≥3 + nonwork_single_max<10분 → `work_cluster`

**게이트**: proactive_disabled / privacy / daily_limit / cooldown

**함정**: `frontmost_duration_ms`는 앱 전환 시 0으로 리셋된다. DeepPause는 `work_cluster_duration_ms` fallback이 생겼지만, Milestone은 아직 같은앱 기준이다.

---

## 시나리오 표

| # | 시나리오 | 현재 동작 | 상태 | 문제/비고 |
|---|---|---|---|---|
| 1 | 작업앱 10분+ 후 idle 120초 (자리 비움) | DeepPause Bubble 발동 | ⚠️ | idle=자리비움인지 화면읽기인지 구분 못 함. 문서 읽는 중에도 발동 |
| 2 | 작업하다 유튜브 실행 | 전환 시 타이머 리셋 → 유튜브 10분 지나야 Drift | ⚠️ | "방금 딴짓 시작"은 감지 못 함. 10분 후에야 반응 |
| 3 | 창 왔다갔다(IDE↔터미널↔브라우저) 작업 | work_cluster≥10분 + switch≥3 + idle≥120초면 DeepPause | ⚠️ | DeepPause는 지원. Milestone은 아직 같은앱 60분 기준이라 멀티태스킹 장기 작업 인정 부족 |
| 4 | 음악(Spotify) 백그라운드 + 작업 | 음악은 frontmost 아님 → 작업앱 기준 정상 발동 | ✅ | 음악 백그라운드는 영향 없음. 정상 |
| 5 | 같은 작업앱 60분 연속 | Milestone Conversation 발동 | ⚠️ | 60분 "같은 앱 연속" 필요. 전환 잦으면 거의 안 옴 |
| 6 | 작업 중 화면에 에러 메시지 뜸(5분+idle 60초+) | OCR blocked → DeepPause 80 Conversation | ✅ | 단 1회 키워드로 발동. false positive 위험(에러 이미 해결 중) |
| 7 | 줌/팀즈 회의 중 | meeting 억제 | ✅ | history 있을 때만. history 없으면 `is_known_meeting_app`로 fallback ✅ |
| 8 | 잠깐 Spotify 열어서 곡 바꿈(60초 미만) | music_short_foreground 억제 | ✅ | 짧은 음악 조작은 침묵 |
| 9 | 딴짓하며 작업앱 사이 짧게 비작업 끼임(3회+) | work_cluster 억제 | ✅ | 단 history 필요. NonWork 단일 10분 미만일 때만 |
| 10 | Safari로 문서/스택오버플로 검색하며 작업 | title에 docs/github/stackoverflow 등 Work 키워드가 있으면 Work | ⚠️ | 키워드 기반이라 일반 Safari 업무 페이지는 아직 Unknown 가능 |
| 11 | Chrome으로 업무(Notion 웹/Docs/Jira) | title 기반 Work 판정. YouTube/Netflix 등은 NonWork 유지 | ✅ | `com.google.chrome` 전체 NonWork 오분류 제거 |
| 12 | Figma/Slack/Discord로 작업 | Work로 분류되어 DeepPause/Milestone 후보 가능 | ⚠️ | Discord는 개인 사용도 많아 MVP 정책 선택. 추후 workspace/server 맥락 필요 |
| 13 | 풀스크린 영상 시청 중 | 영상앱 NonWork면 10분 후 Drift. idle 무관 | ⚠️ | 시청 몰입 중 끊음. 풀스크린 감지 없음 |
| 14 | 게임 실행(Steam 등) | 게임=Unknown → 침묵 | ❌ | 게임 카테고리 없음. Drift도 안 됨 |
| 15 | 발표/화면공유 중 | 화면공유 감지 없음(zoom이면 meeting으로 우연히 억제) | ⚠️ | Keynote 단독 발표는 Unknown → 침묵(운좋게), 의도된 게 아님 |
| 16 | 무시(dismiss) 직후 같은 멈춤 반복 | dismissed_recent_count*10 감산 | ⚠️ | 2회 무시 = -20. 근데 같은 앱 재발동 차단은 없음 |
| 17 | 하루 종일 작업, 발화 누적 | daily_limit 게이트 | ✅ | talk_frequency 일일 제한 |
| 18 | 방금 발화 후 곧바로 또 | cooldown 게이트 | ✅ | talk_frequency cooldown |
| 19 | 새벽/집중시간대 작업 | 시간대 구분 없음 | ❌ | 심야/집중모드 침묵 옵션 없음 |
| 20 | 작업 풀려서 빠르게 타이핑 중(몰입) | idle 낮음 → DeepPause 조건 안 됨. 단 Milestone(60분+idle<600)은 발동 가능 | ⚠️ | 몰입 절정에 Milestone 끼어들 수 있음. 입력 밀도 미반영 |
| 21 | 민감 앱(은행/비밀번호/시크릿창) | privacy 게이트(should_suppress) | ✅ | privacy assessment 의존. 키워드 커버리지가 관건 |
| 22 | 회의 끝나고 바로 작업 복귀 | meeting 풀리고 작업앱 10분+idle → DeepPause | ✅ | 정상 전환 |
| 23 | 짧게 여러 작업앱 옮기다 한 곳 정착 10분+ | 정착 앱에서 frontmost 누적 10분 → 발동 | ✅ | 정착 후엔 정상 |
| 24 | idle 매우 길게(자리 30분 비움) | DeepPause 발동(idle≥120 충족) | ⚠️ | 자리 완전 비움인데 "잠깐 멈춤" 메시지. 부재 감지 없음 |
| 25 | 같은 에러 화면 20분째 유지(진짜 막힘) | OCR 1회 신호만 봄, 반복/지속 미인지 | ❌ | 히스토리 기반 "진짜 막힘" 판정 없음(알려진 한계) |

---

## 집계

| 상태 | 개수 | 시나리오 |
|---|---|---|
| ✅ 지원 | 11 | 4,6,7,8,9,11,17,18,21,22,23 |
| ⚠️ 부분 | 11 | 1,2,3,5,10,12,13,15,16,20,24 |
| 🐛 버그성 | 0 | - |
| ❌ 미지원 | 3 | 14,19,25 (+6 false positive 위험) |

---

## 가장 시급한 구멍 (1일 마감 기준 우선순위)

### ⚠️ 1. 멀티태스킹 작업 장기 세션 (#3)
`frontmost_duration_ms`가 앱 전환마다 리셋된다. DeepPause는 `work_cluster_duration_ms` fallback으로 보강했지만, Milestone은 아직 60분 같은앱 기준이다.
**남은 수정:** Milestone도 장기 work_cluster 또는 별도 work_session 기준으로 전환.

### ⚠️ 2. 브라우저/협업앱 분류 정확도 (#10,12)
- Chrome 전체 NonWork 오분류는 제거됨.
- Safari/Chrome은 title 키워드 기반이라 일반 업무 페이지는 Unknown 가능.
- Slack/Figma/Discord는 Work로 보강됨. 단 Discord는 개인 사용과 업무 사용 구분이 아직 없다.
**남은 수정:** URL/domain 또는 브라우저 탭 메타데이터 기반 분류, Discord workspace 맥락 분리.

### ⚠️ 3. idle ≠ 멈춤 (#1,13,20,24)
입력 없음을 "쉼"으로 단정. 읽기/시청/자리비움/몰입 구분 없음.
**수정(경량):** 
- 입력 밀도(최근 타이핑) 높으면 점수 -30 (몰입 보호)
- idle 매우 김(>10분)이면 "부재"로 보고 발화 보류

### ⚠️ 4. 같은 앱 재발동 차단 (#16)
dismiss 감산만 있고, 같은 앱에서 또 울리는 거 자체는 안 막음.
**수정:** "이 앱에서 이미 발화함 → 앱 떠날 때까지 침묵" 플래그.

### ✅ 5. OCR 발화 인용 = 감시감 (#6,25)
현재 메시지 "막힌 흔적이 보여" = 화면 봤다는 티. 또 1회 키워드로 발동.
**수정:** 
- 메시지에서 화면 내용 인용 금지(프롬프트 한 줄)
- 1회는 관찰만, 2회+ 확인 시 발동(히스토리 필요, 1일엔 무거우면 후순위)

---

## 1일 안에 넣을 최소 3개 (효과/난이도순)

1. **classifier 보강** (#10,11,12) — 완료. 브라우저 title 판정 + Slack/Figma/Discord Work화.
2. **frontmost → work_cluster 기준 전환** (#3) — DeepPause만 완료. Milestone은 남음.
3. **OCR 인용 금지 + 입력밀도 몰입가드** (#5,#3-flow) — 남음. 프롬프트/메시지 톤과 입력 이벤트 데이터 필요.

나머지(시간대, OCR 히스토리, 부재 감지)는 마감 후.
