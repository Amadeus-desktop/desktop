# App Lifecycle Contract

> 기준일: 2026-06-16  
> 목적: Tauri desktop 앱의 auth, protocol, onboarding, window, drag, resize, startup lifecycle을 하나의 계약으로 고정한다.

---

## 1. 결론

현재 Amadeus의 lifecycle은 아직 명확하지 않다.

사실:

- `src-tauri/src/lib.rs`가 app setup, tray, resident close, dev auth callback server, single instance, deep link plugin, window show/focus를 동시에 가진다.
- frontend에서는 `authStore`, `OnboardingFlow`, `useAuthWindow`, `useControlCenterWindow`, `mainWindowLayout`이 각각 직접 window 상태를 바꾼다.
- main window와 companion window가 모두 `hydrateAuth()`를 호출한다.
- 수정 전 resize animation은 JS `requestAnimationFrame` loop에서 Tauri window `setSize`/`setPosition` IPC를 반복 호출했다.
- 수정 전 onboarding drag handle 경로에는 drag threshold 이후 `document.documentElement.style.opacity = "0"`으로 root를 직접 투명화하는 코드가 있었다.

추정:

- 이건 확인된 사실이 아니라 추정입니다. 창 클릭 시 투명화 원인은 아직 근거가 부족하다. drag 중 투명화는 root opacity 변경 코드가 확인되며, resize animation 버벅임과 첫 실행 렉은 lifecycle ownership 분산, 투명 window/compositor 재설정, startup setup 집중, resize IPC loop가 겹쳐 발생할 가능성이 높다.

의견:

- LLM, persona, memory 이전에 lifecycle을 먼저 고정해야 한다. 이 계약이 없으면 auth callback, onboarding transition, companion overlay, OCR/LLM startup이 계속 서로 간섭한다.

---

## 2. 사용자 증상과 lifecycle 가설

| 증상 | 사실 | 추정 원인 | 우선순위 |
| --- | --- | --- | --- |
| 창 click/drag 시 투명화 | drag 중 root opacity를 직접 0으로 만드는 코드가 있다. click 단독 원인은 근거 부족 | direct opacity workaround, transparent window, compositor refresh 타이밍이 겹칠 수 있다 | P1 |
| 창 resize animation 버벅임 | JS RAF loop가 매 frame Tauri `setSize`/`setPosition`을 호출하고 layout request serialization이 없다 | WebView IPC + native resize + React repaint가 같은 프레임 budget을 놓고 경쟁한다 | P1 |
| 처음 켤 때 렉 | setup에서 DB migration, settings load, LLM configure, window configuration, dev auth server start가 같이 돈다 | 첫 paint 전에 native setup과 frontend hydration이 과하게 몰릴 수 있다. sidecar/OCR warmup block은 근거 부족 | P1 |
| protocol 전달 후 onboarding/login 정지 | single-instance argv fallback과 dev callback replay state가 없다 | URL은 들어왔지만 frontend listener 준비 전 유실되거나 main window가 아닌 곳에서 소비될 수 있다 | P1 |

### 2.1 증상별 근거 수준

수정 전 판단 기준:

- `확정`: 코드 또는 로그로 직접 확인됨.
- `강한 추정`: 코드 경로상 발생 가능성이 높지만, 런타임 타이밍 로그/프로파일이 없음.
- `근거 부족`: 현재 코드/로그만으로 원인 특정 불가.

| 증상 | 근거 수준 | 근거 |
| --- | --- | --- |
| drag 중 투명화 | 해결됨 | 과거 `src/lib/tauri/useTauriWindowDragOpacity.ts`가 drag threshold 이후 `document.documentElement.style.opacity = "0"`을 실행했다. L3에서 이 hook과 직접 투명화 경로를 제거했고, drag는 `createWindowDragHandler()` → `start_main_window_drag_command`로 일원화했다. |
| click 단독 투명화 | 근거 부족 | 같은 hook은 `mousedown`만으로 opacity를 바꾸지 않고, threshold를 넘은 `mousemove` 이후에만 바꾼다. click만으로 투명화되는지는 런타임 이벤트 로그가 필요하다. |
| resize animation 버벅임 | 강한 추정 | `animateMainWindowLayoutMode()`가 `requestAnimationFrame`마다 native `setSize`/`setPosition` IPC를 호출한다. companion도 `ResizeObserver`마다 `setSize`와 position sync를 호출한다. 실제 frame drop 수치는 아직 없다. |
| transparent/compositor 영향 | 강한 추정 | config가 `transparent: true`, `titleBarStyle: "Transparent"`, `macOSPrivateApi: true`를 사용하고, Rust/JS 모두 compositor refresh성 1px resize 또는 layer refresh를 가진다. 다만 이것이 click 단독 투명화의 직접 원인이라는 증거는 없다. |
| 첫 실행 렉 | 근거 부족에서 강한 추정 사이 | setup에서 migration/settings/LLM configure/window configure/dev callback server start가 실행되는 것은 사실이다. 하지만 현재 로그에는 startup phase duration이 없어 어느 단계가 느린지 확정할 수 없다. |
| dev login/onboarding 정지 | 확정된 위험 | app log에 `dev auth callback server failed: Resource temporarily unavailable (os error 35)`가 반복 기록되어 있다. loopback callback 서버가 실패하면 dev OAuth callback 전달이 깨질 수 있다. |

결론:

- 지금 바로 수정 가능한 수준으로 확정된 것은 `drag opacity workaround`, `dev auth callback server failure`, `RAF native resize 구조 위험`이다.
- `click 단독 투명화`와 `첫 실행 렉의 병목 단계`는 계측 없이 원인을 단정하면 안 된다.
- 다음 구현 전에는 lifecycle event log와 startup phase duration log를 먼저 추가한다.

### 2.2 계측 로그 계약

코드 수정 전 반드시 아래 로그를 한 번 수집한다.

Rust file log:

- `startup phase completed: phase=... duration_ms=...`
- `dev auth callback server listening`
- `dev auth callback emitted to frontend`
- `macos webview layer refresh scheduled/started/completed`

Frontend forwarded log:

- `main app mounted`
- `companion app mounted`
- `hydrateAuth started/completed/failed`
- `deep link auth listener setup started/completed`
- `loopback auth callback event received`
- `main layout apply started/completed`
- `main native resize animation skipped`
- `main layout apply started/completed`
- `main compositor kick scheduled/completed`
- `main window native drag requested`
- `companion native resize synced`

판정 규칙:

- 첫 drag에서 window가 좌상단으로 점프하면 native drag anchor 좌표 문제다. `start_main_window_drag` 합성 이벤트가 window-local 좌표(`mouseLocationOutsideOfEventStream`)를 쓰는지 확인한다 (tao `start_dragging`은 global 좌표를 넣어 jump를 유발).
- `main native resize animation skipped` 이후에도 버벅임이 재현되면 JS RAF native resize가 아니라 single apply, compositor refresh, React paint, transparent window 쪽을 본다.
- `startup phase completed` 중 특정 phase가 100ms 이상 반복되면 해당 phase를 first-paint 이후로 미룰 후보로 본다.
- `dev auth callback server failed` 또는 `hydrateAuth failed`가 찍히면 login/onboarding 정지 원인은 auth callback path부터 본다.

현재 Evidence Pass 결과:

- `companion native resize synced`가 `width=40,height=40` 같은 값으로 반복되며 각 호출이 약 9.4~9.9초 걸리는 로그가 확인되었다.
- 이 결과는 companion `ResizeObserver` native resize, Rust position sync, `companion-space-changed` event, frontend resync가 서로 물리는 loop 가능성을 강하게 지지한다.
- companion resize에는 size unchanged skip, in-flight coalesce, debounce, position-only sync command 분리가 필요하다.

---

## 3. Lifecycle Source Of Truth

Amadeus는 아래 owner를 따른다.

| 영역 | Authoritative owner | 금지 |
| --- | --- | --- |
| process startup | Rust `app_lifecycle` | `lib.rs`에 setup 세부 로직 계속 추가 |
| protocol/deep link/dev callback | Rust `auth_callback_router` + frontend main auth listener | event-only fire-and-forget |
| auth session | Supabase session, local mirror는 cache | localStorage만 보고 최종 인증 판정 |
| onboarding progress | frontend onboarding store | window layout 직접 확정 |
| main window layout | frontend `main_window_lifecycle` coordinator | 여러 hook/component가 직접 `setSize` |
| companion window | Rust window module + companion lifecycle hook | main auth callback 소비 |
| drag/resize behavior | Rust window module | UI component가 임의로 native drag/resize 반복 |
| sidecar/OCR/LLM startup | deferred runtime manager | 첫 paint 전 heavy startup |

---

## 4. Event Priority

앱은 동시에 여러 event를 받더라도 아래 우선순위를 따른다.

```text
P0 app_quit
P1 auth_callback_received
P2 logout_transition
P3 onboarding_required
P4 control_center_ready
P5 companion_background
P6 sidecar_warmup
P7 OCR/context polling
```

규칙:

- `auth_callback_received`는 어떤 window 상태보다 우선한다.
- auth callback은 main window lifecycle에서만 소비한다.
- companion window는 auth listener를 시작하지 않는다.
- onboarding completion은 window transition 성공/실패와 무관하게 최종 layout reconciliation을 반드시 요청한다.
- sidecar, OCR, trigger polling은 첫 main window paint 이후로 늦춘다.
- `onOpenUrl`/`on_open_url`은 URL list를 전달하지만 대부분 단일 URL이다. callback handler는 list input을 받아야 하고 각 URL을 독립 검증해야 한다.

---

## 5. Rust Lifecycle Contract

목표 구조:

```text
src-tauri/src/lib.rs
  -> builder composition only

src-tauri/src/app_lifecycle/mod.rs
  -> lifecycle module boundary

src-tauri/src/app_lifecycle/auth_callback.rs
  -> amadeus:// auth callback validation
  -> dev loopback callback replay state
  -> single-instance argv fallback

src-tauri/src/app_lifecycle/auth_callback_html.rs
  -> dev loopback callback HTML response rendering

src-tauri/src/app_lifecycle/frontend_log.rs
  -> frontend log command bridge

src-tauri/src/app_lifecycle/resident_windows.rs
  -> resident close policy
  -> companion layout watch

src-tauri/src/app_lifecycle/setup.rs
  -> setup order
  -> state registration
  -> deferred startup work scheduling

src-tauri/src/app_lifecycle/tray.rs
  -> menu bar icon/menu/events
  -> tray-triggered resident app actions

src-tauri/src/app_lifecycle/windows.rs
  -> command wrappers for native window operations

src-tauri/src/app_lifecycle/startup.rs
  -> startup phase duration logging
```

필수 계약:

- `single_instance` callback의 argv fallback은 Amadeus의 방어 정책이다. 공식 문서가 모든 정적 scheme에서 직접 argv 파싱을 필수로 요구하는 것은 아니지만, Amadeus는 protocol 유실 방지를 위해 argv를 버리면 안 된다.
- `amadeus://auth/callback?...`은 Rust에서 검증 후 `amadeus-auth-callback`으로 라우팅한다.
- fake deep link가 argv로 들어올 수 있으므로 scheme만 믿지 말고 host/path/query를 검증한다.
- dev loopback callback은 emit만 하지 말고 마지막 callback을 pending state에 저장한다.
- frontend는 `consume_pending_auth_callback` command로 replay를 확인할 수 있어야 한다.
- debug setup에서 dev callback server start 실패는 반드시 로그로 남긴다.

---

## 6. Frontend Lifecycle Contract

목표 구조:

```text
src/features/lifecycle/
  appLifecycle.ts
  mainWindowLifecycle.ts
  authCallbackLifecycle.ts
```

필수 계약:

- `bootstrapAuth()`는 local mirror만 보고 `hydrated=true`를 최종 확정하지 않는다.
- Supabase session check와 callback listener setup은 별도 phase다.
- `hydrateAuthSession()`과 `startMainAuthCallbackListener()`를 분리한다.
- main window만 deep-link/dev callback listener를 소유한다.
- companion window는 session mirror/hydrated state만 읽고 callback listener를 열지 않는다.
- `OnboardingFlow`는 native window API를 직접 호출하지 않는다.
- `useAuthWindow`, `useControlCenterWindow`, `OnboardingFlow`, `authStore`는 모두 coordinator에 layout request만 보낸다.
- layout request는 serialize 된다. 동시에 두 animation이 돌면 안 된다.

Layout request 형태:

```ts
type MainWindowLayoutRequest = {
  mode: "onboarding" | "control-center";
  reason:
    | "initial-hydration"
    | "login-complete"
    | "auth-callback"
    | "onboarding-complete"
    | "logout"
    | "tray-open"
    | "protocol-open";
  priority?: number; // observability only; current scheduler is FIFO serialized.
};
```

현재 구현 상태:

- L1b: `src-tauri/src/app_lifecycle/auth_callback.rs`가 dev loopback callback, pending replay, protocol argv validation을 소유한다.
- L1b: `src-tauri/src/app_lifecycle/auth_callback_html.rs`가 dev loopback callback HTML 응답 렌더링을 소유한다.
- L1b: `src-tauri/src/app_lifecycle/frontend_log.rs`가 frontend log bridge command를 소유한다.
- L1b: `src-tauri/src/app_lifecycle/resident_windows.rs`가 resident window close/watch 정책을 소유한다.
- L1b: `src-tauri/src/app_lifecycle/setup.rs`가 Tauri setup 순서와 state registration을 소유한다.
- L1b: `src-tauri/src/app_lifecycle/startup.rs`가 startup phase duration log를 소유한다.
- L1b: `src-tauri/src/app_lifecycle/tray.rs`가 menu bar/tray 이벤트를 소유한다.
- L1b: `src-tauri/src/app_lifecycle/windows.rs`가 main drag command와 companion position sync command wrapper를 소유한다.
- L1b: `src-tauri/src/lib.rs`는 Tauri builder composition과 invoke handler registry만 남긴다.
- L2: `src/features/lifecycle/mainWindowLifecycle.ts`가 main window layout request의 단일 coordinator다.
- L2: `authStore`, `useAuthWindow`, `OnboardingFlow`는 직접 layout mode helper를 호출하지 않고 `requestMainWindowLayout()`에 `reason`, 관찰용 `priority`, `animated`를 담아 요청한다.
- L2a: native resize animation 제거/대체와 `useControlCenterWindow`까지의 완전 흡수는 다음 phase로 남긴다.

---

## 7. Window/Drag/Resize Contract

### 7.1 투명화 방지

사실:

- 현재 app config는 main/companion window에 `transparent: true`, `decorations: false`, `shadow: false`, macOS private API를 사용한다.
- `transparent: true`와 `titleBarStyle: "Transparent"`는 다른 개념이다. 전자는 window transparency이고, 후자는 title bar 표시 방식이다.
- macOS transparent window는 `macos-private-api` feature와 `macOSPrivateApi` config를 요구하며, App Store 배포에는 부적합하다.

정책:

- transparent window의 background alpha는 한 계층에서만 관리한다.
- native window background, webview background, CSS root background를 서로 다른 lifecycle에서 바꾸지 않는다.
- drag 시작/종료 시 compositor refresh는 Rust window module에서만 수행한다.
- click/drag 이벤트가 UI opacity class를 직접 변경하면 안 된다.
- 기존 `document.documentElement.style.opacity = "0"` workaround는 P1 제거 대상이다. 유지해야 한다면 feature flag와 timeout fallback, restoration log가 필요하다.

검증:

- click, drag start, drag end 후 root pixel이 완전 transparent가 아닌지 Playwright screenshot 또는 canvas/pixel check로 확인한다.
- drag 중 `document.documentElement.dataset.tauri`와 CSS class가 예기치 않게 바뀌지 않는지 확인한다.

### 7.2 resize animation

사실:

- `animateMainWindowLayoutMode()`는 단일 native command(`animate_main_window_logical_size_command`)를 invoke하고, Rust가 `NSAnimationContext` + `setFrame_display_animate`로 한 번에 resize animation을 수행한다 (macOS).
- 애니메이션 완료 시 Rust는 `main-window-animation-complete` 이벤트를 emit하고, frontend coordinator는 이 이벤트(또는 timeout fallback)까지 await하여 layout queue 점유를 유지한다.

정책:

- JS에서 native `setSize`/`setPosition`을 frame마다 호출하지 않는다. (`requestAnimationFrame` resize 루프 금지)
- resize animation이 필요하면 native side에서 throttle된 단일 command로만 처리한다. macOS는 `NSAnimationContext`를 사용한다.
- 그 단일 command는 fire-and-forget이 아니라 완료 이벤트를 emit해야 하며, coordinator는 완료까지 await해서 두 window animation이 절대 겹치지 않게 한다 (serialized queue 보장).
- native 애니메이션은 종료 시점의 frame을 최종 상태로 보고, 완료 핸들러에서 size/position을 다시 apply하지 않는다 (AppKit/Tauri 좌표계 혼용으로 인한 end-of-animation jump 방지).
- 호출부(authStore / OnboardingFlow / useAuthWindow)는 애니메이션 시간을 직접 sleep하지 않고 `requestMainWindowLayout({ animated: true })`만 보낸다.
- onboarding/control-center shell content 전환은 즉시 size apply가 아니라 CSS opacity transition으로 처리한다.
- companion dynamic resize는 예외 후보지만 현재처럼 frontend `ResizeObserver`가 직접 `setSize()`를 호출하는 구조는 임시로만 허용한다. 장기적으로는 Rust window command 또는 serialized layout queue로 흡수한다.

### 7.3 drag

정책:

- main window drag는 `start_main_window_drag_command`(native `performWindowDragWithEvent`, window-local anchor) 단일 owner다. tao `data-tauri-drag-region`/`startDragging()`은 async IPC 경로에서 첫 drag jump를 유발하므로 main window에서는 사용하지 않는다.
- onboarding drag handle과 control-center JS drag는 `createWindowDragHandler()`(mousedown → command)로 통일한다.
- custom drag opacity, CSS pointer policy, native start dragging을 동시에 건드리지 않는다.
- interactive element는 drag region 안에 묻히면 안 된다 (`createWindowDragHandler`가 `INTERACTIVE_SELECTOR`로 제외).

---

## 8. Startup Contract

첫 실행 critical path:

```text
1. logger init
2. settings path/database path resolve
3. lightweight state registration
4. window configure
5. first main window paint
6. auth listener setup
7. onboarding/auth hydration
8. deferred sidecar/OCR/trigger warmup
```

금지:

- 첫 paint 전에 local LLM sidecar startup을 block하지 않는다.
- 첫 paint 전에 OCR/capture provider warmup을 block하지 않는다.
- first window show 전에 DB vacuum, heavy migration, model scan을 실행하지 않는다.
- Rust는 frontend first paint 또는 ready event를 받아 deferred work를 시작한다.

---

## 9. Official Tauri References

사실:

- Tauri window customization 공식 문서는 custom titlebar, transparent window, size constraints, permissions를 window customization 영역으로 다룬다.
- 같은 문서는 macOS custom titlebar가 native window 기능 일부를 잃을 수 있다고 설명하고, drag region은 직접 적용된 element에만 동작한다고 명시한다.
- Tauri deep-link 공식 문서는 running app URL은 `onOpenUrl`, startup URL은 `getCurrent`로 처리하라고 설명한다.
- Tauri desktop deep-link 문서는 Linux/Windows에서 deep link가 새 process argv로 전달될 수 있고, single-instance plugin의 deep-link feature와 함께 쓰는 흐름을 설명한다.
- Tauri single-instance 공식 문서는 single-instance plugin이 다른 plugin보다 먼저 등록되어야 잘 동작한다고 설명한다.
- Tauri deep-link 문서는 fake deep link argv 가능성을 경고하며 앱이 기대하는 URL 형식인지 검증해야 한다고 설명한다.
- Tauri config 문서는 macOS private API가 App Store 거절 사유가 될 수 있다고 경고한다.
- Tauri capabilities 문서는 plugin command permission과 앱이 `invoke_handler`로 등록한 command exposure를 구분한다. 앱 command는 별도 검토 없이 모든 window/webview에 열릴 수 있으므로 command surface를 lifecycle review 대상에 포함한다.

참조:

- Tauri Window Customization: https://v2.tauri.app/learn/window-customization/
- Tauri Deep Linking: https://v2.tauri.app/plugin/deep-linking/
- Tauri Single Instance: https://v2.tauri.app/plugin/single-instance/
- Tauri Config Reference: https://v2.tauri.app/reference/config/

---

## 10. Project References

아래는 2026-06-16 기준 GitHub에서 확인한 Tauri 기반 대표 프로젝트다. stars 수는 GitHub API/UI 기준의 현재값이며 시간이 지나면 변할 수 있다.

### 10.1 Spacedrive

사실:

- GitHub API 기준 38,315 stars.
- `apps/tauri/src-tauri/src/windows.rs`에 window enum, creation helper, show/close/list/resize command가 분리되어 있다.
- transparent overlay, voice overlay, drag overlay 같은 특수 window의 생성 정책을 `windows.rs`로 분리해 관리한다.
- main config는 main window를 `visible: false`로 두고 frontend ready 이후 show하는 경로를 가진다.
- drag 관련 코드는 별도 `drag` module로 분리되어 있다.
- 단, `main.rs`도 setup, daemon, callback, invoke handler를 많이 가진다. 이 사례는 lifecycle 완전 분리가 아니라 변동성이 큰 window/overlay/drag 정책의 모듈화 사례로 본다.

참조:

- Repository: https://github.com/spacedriveapp/spacedrive
- Window module: https://github.com/spacedriveapp/spacedrive/blob/main/apps/tauri/src-tauri/src/windows.rs
- Tauri main: https://github.com/spacedriveapp/spacedrive/blob/main/apps/tauri/src-tauri/src/main.rs
- Config: https://github.com/spacedriveapp/spacedrive/blob/main/apps/tauri/src-tauri/tauri.conf.json

Amadeus에 적용할 점:

- main/companion/overlay window는 enum 또는 typed descriptor로 관리한다.
- transparent overlay는 항상 별도 policy를 둔다.
- drag/resize는 window module 책임으로 모은다.

### 10.2 GitButler

사실:

- GitHub API 기준 21,053 stars.
- Tauri desktop app이라고 README에 명시되어 있다.
- `crates/gitbutler-tauri/src/window.rs`가 window state와 window creation을 담당한다.
- main setup에서 window를 생성하고, deep link open event에서는 main window를 show/focus하는 처리가 있다.
- `tauri_plugin_window_state`를 사용해 window state를 plugin으로 관리한다.

참조:

- Repository: https://github.com/gitbutlerapp/gitbutler
- Window module: https://github.com/gitbutlerapp/gitbutler/blob/master/crates/gitbutler-tauri/src/window.rs
- Tauri main: https://github.com/gitbutlerapp/gitbutler/blob/master/crates/gitbutler-tauri/src/main.rs

Amadeus에 적용할 점:

- window state를 frontend localStorage에 흩뿌리지 말고 lifecycle owner에서 관리한다.
- deep link는 최소한 main window show/focus와 연결되어야 한다.
- project 규모가 커질수록 `lib.rs`가 아니라 dedicated crate/module에 lifecycle을 둔다.

### 10.3 Pake

사실:

- GitHub API 기준 50,500 stars.
- `src-tauri/src/app/window.rs`에 window builder 로직이 집중되어 있다.
- config 기반 window 생성, additional window, requested new window, platform별 옵션이 별도 module에 있다.
- unit test로 window option merge/new-window behavior를 검증하는 파일이 있다.

참조:

- Repository: https://github.com/tw93/Pake
- Window module: https://github.com/tw93/Pake/blob/main/src-tauri/src/app/window.rs
- Config variants: https://github.com/tw93/Pake/tree/main/src-tauri
- Tests: https://github.com/tw93/Pake/tree/main/tests/unit

Amadeus에 적용할 점:

- window option은 config/model로 합성하고 test로 고정한다.
- dev/prod/mac/windows config 차이를 파일로 분리한다.
- dynamic window 생성은 한 module에서만 수행한다.

### 10.4 Additional Reference Candidates

사실:

- `clash-verge-rev`는 `lifecycle`, `tray`, `window_manager` 계층이 있는 높은 stars Tauri 프로젝트다.
- `Cap`은 screen recording desktop app으로 window, tray, deeplink, window position persistence 사례가 Amadeus와 유사하다.
- `pot-desktop`은 OCR/translation desktop app으로 OCR, tray, window 구조 비교 가치가 있다.

의견:

- 위 세 프로젝트는 구현 직전 추가 조사 대상으로 둔다. 이 문서의 핵심 결론은 Spacedrive, GitButler, Pake만으로도 충분하지만, screen recording/OCR 특성은 Cap/pot-desktop 쪽이 더 가깝다.

---

## 11. Current Amadeus Gaps

P1:

- startup critical path와 deferred warmup이 분리되지 않음.

P2:

- transparent/compositor refresh owner가 명확하지 않음.
- layout request priority는 현재 스케줄링 우선순위가 아니라 관찰용 값이다. 실제 scheduling은 FIFO serialized queue다.
- frontend auth callback getCurrent/onOpenUrl/dev loopback event의 integration-level duplicate consume 테스트가 아직 없다.
- config/capability regression test가 없음.
- first-paint invoke payload는 런타임 smoke 또는 단위 테스트가 아직 부족하다.
- compositor kick 1px resize는 아직 남은 버벅임 후보이며, 장기적으로 Rust layer refresh owner로 수렴해야 한다.

해소됨:

- single-instance argv URL fallback은 Rust contract test와 함께 추가됨.
- dev auth callback pending replay는 Rust command와 1회 소비 test로 추가됨.
- local mirror가 `hydrated=true`를 최종 확정하던 auth source-of-truth 문제는 bootstrap/storage path 모두 Supabase verification을 다시 타도록 수정됨.
- companion window가 auth callback listener/dev callback server를 소유하던 문제는 main-only owner guard로 1차 차단됨.
- companion resize loop는 size skip/in-flight coalesce/debounce/position-only sync로 hotfix됨.
- JS frame loop native resize animation은 L3에서 제거됨.
- drag 중 root opacity 직접 변경은 L3에서 제거됨.
- `lib.rs`는 builder composition과 invoke handler registry 중심으로 축소됨.
- Rust auth callback event/pending replay consume은 main window만 대상으로 제한됨.
- dev auth callback server deadline은 server reuse마다 연장되도록 수정됨.
- companion event resync는 size unchanged 상태에서도 position-only sync를 수행하도록 수정됨.

---

## 12. Implementation Phases

### Phase L0: Freeze Contract

- 이 문서를 source of truth로 둔다.
- lifecycle 관련 코드 변경은 이 문서의 owner/priority를 따른다.

### Phase L0a: Evidence Pass

- startup/auth/window/drag/resize 계측 로그를 먼저 수집한다.
- click-only, drag, onboarding completion, logout/login, app cold start를 각각 1회 이상 재현한다.
- `amadeus.log`와 DevTools console을 비교해 frontend forwarded log가 파일에 남는지 확인한다.
- 이 단계 전에는 click 단독 투명화와 startup 병목을 확정 원인으로 쓰지 않는다.
- companion resize loop는 evidence 확보됨. P1 hotfix로 size skip/in-flight coalesce/debounce/position-only sync를 적용한다.

### Phase L1a: Baseline Contract Tests

- auth callback parser, single-instance argv extraction, dev loopback pending replay contract test를 먼저 추가한다.
- frontend auth callback getCurrent/onOpenUrl/dev loopback event, duplicate consume, main-only listener contract test를 추가한다.
- onboarding completion fallback layout test를 추가한다.
- 현재 실패하는 테스트는 expected failure 또는 pending으로 두지 않는다. 구현 slice 안에서 바로 통과시킨다.

진행 상태:

- auth callback URL은 exact app route, exact dev loopback host/port/path만 허용하도록 adapter contract test를 보강했다.
- companion resize loop 회귀 방지를 위해 native window size 계산과 unchanged-size skip 정책을 pure contract test로 고정했다.
- Rust single-instance argv extraction은 `amadeus://auth/callback?code=...` exact route만 허용하도록 contract test로 고정했다.
- dev loopback/deep-link race 대응을 위해 pending auth callback 저장/1회 소비 command를 추가하고 contract test로 고정했다.
- main-only frontend listener ownership은 `view=companion`을 callback owner에서 제외하는 contract test로 고정했고, main window만 pending replay/listener/dev server를 시작하도록 연결했다.
- onboarding completion은 animation 실패 시 `control-center` layout fallback을 호출하고 fallback 실패도 completion을 막지 않는 contract test로 고정했다.
- L1a 핵심 contract slice 완료. 남은 integration-level duplicate consume 테스트는 P2 backlog로 둔다. 다음 phase는 L1b Rust App Lifecycle Split이다.
- subagent 검토에서 지적된 auth source-of-truth P1은 local mirror가 `hydrated=true`를 확정하지 않도록 수정했고, 최종 auth hydration은 Supabase `getUser()` 결과만 인정하도록 조정했다.
- cross-window storage event도 local mirror만으로 `hydrated=true`를 세우지 않고 Supabase verification을 다시 예약하도록 수정했다.

### Phase L1b: Rust App Lifecycle Split

- `app_lifecycle` module 추가.
- `lib.rs`는 builder composition만 남긴다.
- `auth_callback`, `auth_callback_html`, `frontend_log`, `resident_windows`, `setup`, `startup`, `tray`, `windows` submodule 추가.
- single-instance argv auth fallback 추가.
- dev callback pending replay state 추가.

### Phase L2: Frontend Lifecycle Coordinator

- `src/features/lifecycle` 추가.
- main window layout request queue 추가.
- `hydrateAuthSession()`과 `startMainAuthCallbackListener()` 분리.
- auth callback consumption은 main window only로 제한.
- `bootstrapAuth()`가 Supabase verification을 막지 않도록 수정.
- onboarding completion은 `finally requestLayout("control-center", "onboarding-complete")`를 보장.

진행 상태:

- main window layout request는 `src/features/lifecycle/mainWindowLifecycle.ts`의 `requestMainWindowLayout()` coordinator를 통해 serialized async queue를 탄다.
- `authStore`, `useAuthWindow`, `OnboardingFlow`의 직접 layout 전환 호출은 `reason`, `priority`, `animated`가 포함된 request object 기반 entrypoint로 전환했다.
- 아직 남은 항목: `useControlCenterWindow`까지 lifecycle coordinator로 흡수하는 작업과 JS RAF native resize 제거는 L2a/L3 범위다.

### Phase L2a: First Paint Gate And Logging

- frontend가 Rust에 `frontend_ready` 또는 `main_window_first_paint` event/command를 보낸다.
- Rust startup phase duration log를 남긴다.
- auth callback received/replayed/consumed/duplicate, layout queued/applied/fallback 로그를 추가한다.
- debug dev callback server start failure를 `LogArea::Auth`에 남긴다.

진행 상태:

- `src-tauri/src/app_lifecycle/frontend_ready.rs`가 `record_frontend_ready` command와 first-paint 중복 방지 state를 소유한다.
- main window는 `main_window_first_paint`, companion window는 `companion_window_first_paint`를 double `requestAnimationFrame` 이후 Rust로 전송한다.
- Rust auth callback router는 callback received, pending replay overwrite, event emit, pending consume 결과를 로그로 남긴다.
- frontend main window lifecycle coordinator는 layout requested/completed/failed를 reason, 관찰용 priority, request id, total duration과 함께 로그로 남긴다.
- Rust setup phase duration log와 debug dev callback server failure log는 기존 구현을 유지한다.

### Phase L3: Window Performance Stabilization

- JS RAF native resize animation 제거.
- resize animation은 단일 native command(`NSAnimationContext`)로 수행하고, 완료 이벤트로 coordinator가 await한다.
- shell content 전환은 CSS opacity transition으로 처리.
- click/drag transparent regression check 추가.
- layout slow log 추가.

진행 상태:

- `animateMainWindowLayoutMode()`는 `requestAnimationFrame` 루프를 사용하지 않고, 단일 native command를 invoke한 뒤 `main-window-animation-complete` 이벤트(또는 timeout fallback)까지 await한다.
- animated layout request는 native `NSAnimationContext` resize animation을 사용하며, layout queue는 애니메이션 완료까지 직렬로 점유된다 (두 animation 동시 실행 불가).
- 애니메이션 완료 핸들러는 size/position을 재적용하지 않고 webview layer refresh + 완료 이벤트 emit만 수행한다.
- 호출부(authStore / OnboardingFlow)는 애니메이션 duration을 직접 sleep하지 않는다.
- onboarding drag hook은 더 이상 `document.documentElement.style.opacity = "0"`을 실행하지 않는다.
- onboarding drag hook은 click/drag threshold/release 진단 로그만 남긴다.
- 남은 L3 항목: Playwright 또는 수동 smoke로 click/drag 투명화 회귀와 layout transition 체감 확인.

### Phase L4: Startup Defer

- first paint 이전 작업과 이후 작업을 분리.
- sidecar/OCR/trigger warmup은 first paint 이후 defer.
- startup phase 로그 추가.

### Phase L5: Regression Tests

- L1a~L4에서 추가한 테스트를 전체 regression suite로 묶는다.
- Tauri config/capability scheme test.
- Vitest unit/contract test.
- Rust unit test.
- manual smoke 또는 Playwright e2e: Playwright는 현재 기본 테스트 인프라가 아니므로 도입 전까지 수동 체크리스트를 유지한다.
- resize/drag transparency smoke test.

---

## 13. Rollback And Flags

초기 구현은 아래 fallback을 남긴다.

| Flag | 기본값 | 의미 |
| --- | --- | --- |
| `AMADEUS_LEGACY_AUTH_LISTENER` | `false` | 새 auth callback coordinator 비활성화 |
| `AMADEUS_DISABLE_LAYOUT_QUEUE` | `false` | serialized layout queue 비활성화 |
| `AMADEUS_DISABLE_STARTUP_DEFER` | `false` | first-paint 이후 defer 비활성화 |
| `AMADEUS_DISABLE_COMPOSITOR_KICK` | `false` | compositor refresh workaround 비활성화 |

정책:

- flag는 영구 feature가 아니라 migration safety net이다.
- 각 flag는 제거 예정 phase를 가져야 한다.
- rollback은 data migration 없이 가능해야 한다.

---

## 14. Non-goals

- 이 문서는 persona, LLM prompt, memory architecture를 다루지 않는다.
- 이 문서는 UI redesign 문서가 아니다.
- 이 문서는 모든 lifecycle 구현을 한번에 강제하지 않는다. 단, 새 코드는 이 owner/priority를 위반하면 안 된다.
