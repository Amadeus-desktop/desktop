import type { OnboardingMessages } from "../modules/onboarding";

export const onboarding: OnboardingMessages = {
  steps: {
    login: "サインイン",
    permissions: "権限",
    setup: "はじめる",
  },
  permissions: {
    headline: "画面の文脈に権限が必要です",
    subheadline:
      "Amadeusは画面を保存せず、必要なときだけ短く読み取って文脈を補います。",
    bullets: [
      "常時録画・保存はしません",
      "機微なウィンドウはキャプチャしません",
      "設定からいつでもオフにできます",
    ],
    screenStatus: "画面収録",
    ocrStatus: "OCR",
    granted: "許可済み",
    needed: "必要",
    unavailable: "利用不可",
    checking: "確認中…",
    requestAccess: "画面収録を許可",
    openSettings: "システム設定を開く",
    checkAgain: "再確認",
    next: "次へ",
    skip: "あとで — 基本モードで続行",
  },
  setup: {
    headline: "一緒に過ごす相手を選びましょう",
    subheadline: "応答方式とペルソナは設定からいつでも変更できます。",
    modelLabel: "応答方式",
    modelApi: "Cloud API",
    modelLocal: "端末 Local",
    modelLocalHint: "モデルパスは設定 → 詳細から指定できます。",
    personaLabel: "ペルソナ",
    continue: "はじめる",
  },
};
