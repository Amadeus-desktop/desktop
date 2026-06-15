import type { PerceptionMessages } from "../modules/perception";

export const perception: PerceptionMessages = {
  eyebrow: "Context Guardrail",
  title: "画面認識ガイド",
  description: "画面キャプチャ、アプリログ、アイドル信号を合わせて発話可否を判断します。",
  sections: {
    capture: "Capture",
    liveContext: "Live Context",
  },
  analysis: {
    label: "画面分析",
    subtitle: "現在のウィンドウと文脈変化だけを短く要約",
    switchLabel: "画面分析",
  },
  proactiveTrigger: {
    label: "能動発話キュー",
    subtitle: "長期停滞と散漫信号を発話候補として記録",
    switchLabel: "能動発話キュー",
  },
  privacyFilter: {
    label: "機微情報フィルター",
    subtitle: "分析前にローカルでマスキング",
    switchLabel: "機微情報フィルター",
  },
  privacyKeywords: {
    label: "ユーザー語",
    subtitle: "カンマ区切りで追加の機微パターンを登録",
    inputLabel: "機微キーワード",
  },
  liveContext: {
    activeApp: "現在のアプリ",
    windowTitle: "ウィンドウタイトル",
    stateSync: "状態同期",
    category: "アプリ分類",
  },
  privacyCard: {
    title: "個人情報フィルター",
    description: "アカウント、パスワード、IDパターンはコンテキストから除外します。",
    active: "有効",
    inactive: "無効",
    blocked: "ブロック",
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
    sensitiveBlocked: "機微コンテキストをブロック",
    analysisWaiting: "分析待機中",
    analysisPaused: "分析一時停止",
    analysisLoading: "コンテキスト更新中",
    analysisError: "コンテキスト取得失敗",
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
