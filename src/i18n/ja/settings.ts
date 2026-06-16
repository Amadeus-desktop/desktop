import type { SettingsMessages } from "../modules/settings";

export const settings: SettingsMessages = {
  eyebrow: "Preferences",
  title: "一般設定",
  description: "companionとの日常 — 口調、呼び名、声かけの頻度を整えます。",
  sections: {
    conversation: "一緒に",
    model: "モデル · 接続",
    language: "言語",
  },
  advanced: {
    toggle: "詳細設定",
    hint: "ローカルモデル、LLMルーティング、テスト発話",
  },
  locale: {
    label: "表示言語",
    subtitle: "UIとcompanionメッセージの言語",
    options: {
      ko: "한국어",
      en: "English",
      ja: "日本語",
    },
  },
  talkFrequency: {
    label: "声かけ頻度",
    subtitle: "作業の流れを妨げない基本強度",
    options: {
      quiet: "静かに控えめに",
      balanced: "ほどよくやさしく",
      active: "元気に積極的に",
    },
  },
  nickname: {
    label: "呼び名",
    subtitle: "吹き出しとチャットで使う名前",
    inputLabel: "呼び名",
  },
  nightCare: {
    label: "夜間配慮",
    subtitle: "遅い時間は短く、低いトーンで",
    switchLabel: "夜間配慮",
  },
  modelRoute: {
    label: "LLMルーティング",
    subtitle: "既定の応答経路とローカル優先度",
    options: {
      "api-first": "API優先",
      "local-first": "ローカル優先",
      template: "テンプレート",
    },
  },
  localFallback: {
    label: "ローカル代替",
    subtitle: "API失敗時にllama.cppへ切り替え",
    switchLabel: "ローカルLLM代替",
  },
  localModelPath: {
    label: "GGUFモデルパス",
    subtitle: "llama.cppが読み込むローカルモデル",
    inputLabel: "モデルパス",
  },
  llamaBinaryPath: {
    label: "llama-serverパス",
    subtitle: "アプリデータsidecars内の実行ファイル",
    inputLabel: "バイナリパス",
  },
  llamaServer: {
    label: "llama.cppサーバー",
    subtitle: "ローカルsidecar接続先",
    hostLabel: "ホスト",
    portLabel: "ポート",
  },
  sidecarStatus: {
    label: "ローカルサーバー状態",
    running: "実行中",
    configured: "準備完了",
    unconfigured: "未設定",
    checking: "確認中…",
  },
  modelPreset: {
    label: "推奨ローカルモデル",
    subtitle: "8GB RAMノートPC向けの既定推奨",
    recommended: "Qwen2.5-3B-Instruct GGUF (Q4_K_M, ~2GB)",
  },
  llmHealth: {
    label: "LLM provider状態",
    checking: "確認中…",
    available: "利用可能",
    unavailable: "利用不可",
  },
  testUtterance: {
    label: "テスト発話",
    subtitle: "現在のルートで短いcompanion発話を生成します。",
    button: "テスト実行",
    running: "生成中…",
  },
  appearance: {
    label: "テーマ",
    subtitle: "アプリの明るさ — ダーク、ライト、システム連動",
    options: {
      dark: "ダーク",
      light: "ライト",
      system: "システム",
    },
  },
  accentColor: {
    label: "強調色",
    subtitle: "ボタン、トグル、ポイントカラー",
    options: {
      rose: "ローズ",
      lavender: "ラベンダー",
      sky: "スカイ",
      mint: "ミント",
      peach: "ピーチ",
    },
  },
  companionPersona: {
    label: "companionペルソナ",
    subtitle: "口調と関係設定",
    icons: {
      bubble: "吹き出し",
      letter: "手紙",
      star: "星",
      orb: "オーブ",
    },
  },
  mateIcon: {
    label: "メイト",
    subtitle: "右下に表示するアイコン — 外枠は強調色に連動",
    icons: {
      bubble: "会話",
      letter: "手紙",
      star: "星",
      orb: "丸",
    },
  },
};
