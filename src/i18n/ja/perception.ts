import type { PerceptionMessages } from "../modules/perception";

export const perception: PerceptionMessages = {
  eyebrow: "Together",
  title: "一緒にいる設定",
  description: "そっとそばにいる方法を決めます。機微な画面は自動で隠します。",
  sections: {
    basics: "基本",
    details: "詳細",
  },
  analysis: {
    label: "そばにいる",
    subtitle: "今のことを静かに把握して、声かけのタイミングを合わせます",
    switchLabel: "そばにいる",
  },
  proactiveTrigger: {
    label: "先に声をかける",
    subtitle: "長く止まったり流れが切れたとき、やさしく寄り添います",
    switchLabel: "先に声をかける",
  },
  privacyFilter: {
    label: "機微な画面を隠す",
    subtitle: "パスワード、金融、メッセージ画面は分析しません",
    switchLabel: "機微な画面を隠す",
  },
  privacyKeywords: {
    label: "追加で隠す語",
    subtitle: "カンマ区切りで隠したいパターンを入力",
    inputLabel: "隠す語",
  },
  liveContext: {
    activeApp: "今のアプリ",
    windowTitle: "ウィンドウ名",
    stateSync: "状態",
    category: "分類",
  },
  privacyCard: {
    title: "プライバシー保護",
    description: "アカウント、パスワード、IDパターンはコンテキストから除外します。",
    active: "オン",
    inactive: "オフ",
    blocked: "隠す",
    screenPermission: "画面権限",
    permissionGranted: "許可済み",
    permissionNeeded: "要確認",
    sensitiveState: "機微状態",
    passed: "通過",
    reasons: {
      password_manager: "パスワード",
      finance: "金融",
      messaging: "メッセージ",
      email: "メール",
      government: "政府/認証",
      authentication: "認証",
      custom_keyword: "ユーザー語",
    },
  },
  status: {
    sensitiveBlocked: "機微な画面のためお休み中",
    analysisWaiting: "そっと見守っています",
    analysisPaused: "一時お休み中",
    analysisLoading: "状態を確認中",
    analysisError: "状態を読み込めませんでした",
  },
  advanced: {
    toggle: "詳しく見る",
    hint: "リアルタイム画面状態とフィルター詳細",
  },
  contextLabels: {
    idleActive: "アクティブ ({seconds}秒 idle)",
    idlePaused: "アイドル ({minutes}分 idle)",
    categories: {
      work: "業務アプリ",
      non_work: "非業務アプリ",
      unknown: "未分類",
    },
  },
};
