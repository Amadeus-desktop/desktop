import type { AuthMessages } from "../modules/auth";

export const auth: AuthMessages = {
  onboarding: {
    headline: "そっと寄り添うコンパニオン",
    subheadline: "Googleでサインインして、設定を端末間でそろえられます。",
    googleButton: "Googleで続行",
    footnote: "続行すると利用規約およびプライバシーポリシーに同意したものとみなされます。",
  },
  account: {
    section: "アカウント",
    signedInAs: "Googleでサインイン中",
    logout: "ログアウト",
    loggingOut: "サインアウト中…",
  },
  profile: {
    eyebrow: "プロフィール",
    title: "マイアカウント",
    description: "Googleアカウントと、Amadeusが呼ぶ名前を管理します。",
    displayNameLabel: "呼び名",
    displayNameHint: "コンパニオンが話しかけるときの名前です。",
    emailLabel: "メール",
    openSettings: "一般設定",
    modelRouteLabel: "話す方式",
    modelRouteHint: "オンラインか、この端末の中だけかを選びます。",
  },
};
