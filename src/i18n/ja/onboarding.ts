import type { OnboardingMessages } from "../modules/onboarding";

export const onboarding: OnboardingMessages = {
  steps: {
    login: "サインイン",
    permissions: "文脈の許可",
    modelRoute: "応答方式",
    setup: "相棒",
  },
  permissions: {
    headline: "そばにいるために許可が必要です",
    subheadline: "画面は保存しません。必要なときだけ少し読みます。",
    promiseChips: ["保存しない", "機微な画面は見ない"],
    statusLabel: "画面収録",
    granted: "許可済み",
    needed: "必要",
    checking: "確認中…",
    requestAccess: "許可する",
    settingsHint: "設定が開いたら Amadeus をオンにしてください。",
    requestFailed: "システム設定の「プライバシーとセキュリティ」>「画面収録」で Amadeus をオンにしてください。",
    next: "次へ",
    skip: "あとで",
  },
  modelRoute: {
    headline: "どう話してほしいですか？",
    subheadline: "クラウド API かローカル LLM から選んでください。",
    continue: "次へ",
    apiHint: "オンライン時はクラウド API で応答します。設定からいつでも変更できます。",
    localHint: "端末上で llama.cpp を使います。モデルパスは一般設定で調整できます。",
    options: {
      api: {
        title: "クラウド API",
        description: "速くて安定した応答",
      },
      local: {
        title: "ローカル LLM",
        description: "端末内だけで処理",
      },
    },
  },
  setup: {
    headline: "誰と一緒に過ごしますか？",
    subheadline: "口調は違っても、そばにいる気持ちは同じです。",
    continue: "そばに置く",
  },
};
