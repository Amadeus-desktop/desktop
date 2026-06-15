import type { AuthMessages } from "../modules/auth";

export const auth: AuthMessages = {
  onboarding: {
    headline: "今日をそっと見守るコンパニオン",
    subheadline:
      "Amadeusは画面の向こうから、やさしい声かけと、一日を振り返る時間を届けます。",
    body: "Googleアカウントでサインインすると、設定や記録を端末間で安全にそろえられます。",
    googleButton: "Googleで続行",
    footnote: "続行すると、利用規約およびプライバシーポリシーに同意したものとみなされます。",
  },
  account: {
    section: "アカウント",
    signedInAs: "Googleでサインイン中",
    logout: "ログアウト",
    loggingOut: "サインアウト中…",
  },
};
