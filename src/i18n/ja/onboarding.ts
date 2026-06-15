import type { OnboardingMessages } from "../modules/onboarding";

export const onboarding: OnboardingMessages = {
  steps: {
    login: "サインイン",
    permissions: "文脈の許可",
    modelRoute: "話す方式",
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
    requestFailed: "プライバシーとセキュリティ > 画面収録で Amadeus をオンにしてください。",
    next: "次へ",
    skip: "あとで",
  },
  modelRoute: {
    headline: "どう話してほしいですか？",
    subheadline: "心地よい方を選んでください。あとから変えられます。",
    continue: "次へ",
    apiHint: "ネットにつながれば、すぐ話しかけてくれます。",
    localHint: "この端末の中だけ。外には出ません。",
    options: {
      api: {
        title: "オンライン",
        description: "やわらかく、すぐに",
      },
      local: {
        title: "端末の中",
        description: "静かに、あなただけ",
      },
    },
  },
  setup: {
    headline: "誰と一緒に過ごしますか？",
    subheadline: "口調は違っても、そばにいる気持ちは同じです。",
    continue: "そばに置く",
  },
  preparing: {
    eyebrow: "少しだけ",
    title: "設定を準備しています",
    subtitle: "そばに合わせて整えています。",
    doneEyebrow: "準備完了",
    doneTitle: "完了しました！",
    doneSubtitle: "そばで話せる準備ができました。",
    doneHint: "まもなく始めます。",
  },
};
