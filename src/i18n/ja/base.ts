import type { AppLocale } from "../types";

export const base: AppLocale = {
  common: {
    appName: "Amadeus",
    activeCompanion: "Active Companion",
    loading: "読み込み中…",
    empty: "まだ記録がありません。",
  },
  controlCenter: {
    tabs: {
      character: "キャラクター",
      settings: "一般設定",
      perception: "画面認識ガイド",
      report: "作業レポート",
    },
    sections: {
      character: "Character",
      currentMode: "Current Mode",
    },
  },
  settings: {
    eyebrow: "Preferences",
    title: "一般設定",
    description: "能動的な声かけ、モデルルーティング、夜間配慮を設定します。",
    sections: {
      conversation: "Conversation",
      model: "Model",
      language: "Language",
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
  },
  character: {
    eyebrow: "Amadeus Persona",
    title: "キャラクター選択",
    description: "作業の流れに合わせて口調と反応強度を調整する相棒プロフィールです。",
    section: "Character",
    currentMode: "Current Mode",
    currentModeTemplate: "{name}基準で吹き出しとチャットのトーンを合わせます。",
    profiles: {
      ruda: {
        name: "ルダ",
        description: "やんちゃな妹テンション",
      },
      emilia: {
        name: "エミリア",
        description: "さりげなく見守るやさしさ",
      },
      daon: {
        name: "ダオン",
        description: "落ち着いた静かな慰め",
      },
    },
  },
  perception: {
    eyebrow: "Context Guardrail",
    title: "画面認識ガイド",
    description:
      "画面キャプチャ、アプリログ、アイドル信号を合わせて発話可否を判断します。",
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
    },
  },
  report: {
    eyebrow: "Daily Review",
    title: "作業レポート",
    description: "今日の集中時間と能動発話の履歴を一画面で確認します。",
    sections: {
      summary: "Summary",
      timeline: "Timeline",
    },
    metrics: {
      focusTime: "今日一緒に走った集中時間",
      utterances: "companionからのさりげない励まし",
    },
    timeline: {
      loading: "タイムラインを読み込んでいます。",
      empty: "保存されたタイムラインはまだありません。",
    },
    fallback: {
      focusTimeValue: "3時間45分",
      utterancesValue: "6回",
    },
  },
  companion: {
    presence: {
      open: "アマを開く",
      wake: "アマを起こす",
      newMessage: "新しいメモ",
    },
    status: {
      quiet: "静かにそばにいる",
      pocket: "さっきのメモから続き",
      deep: "もう少し深く聴いている",
      dailyCare: "今日を一緒に閉じている",
      sleep: "休んでいる",
    },
    nudge: {
      close: "メモを閉じる",
      ignore: "今は大丈夫",
    },
    chat: {
      close: "会話を閉じる",
      send: "送る",
      waiting: "一言だけでも大丈夫。",
      placeholder: "一言だけでも大丈夫",
      placeholderDeep: "続けても大丈夫",
      dailyCareLink: "今日を一緒に閉じる？",
    },
    dailyCare: {
      subtitle: "今日の小さな記録",
      title: "今日はよく頑張ったね。",
      close: "Daily Careを閉じる",
      intro: "努力したことを一緒に振り返ろう？",
      togetherTime: "一緒にいた時間",
      togetherTimeValue: "2時間40分",
      noteCount: "アマが残したメモ",
      noteCountValue: "3件",
      keywords: "今日の感情キーワード",
      keywordValue: "踏ん張り · 行き詰まり · 再スタート",
      closing: "アマからの短いメモ",
      closingMessage:
        "最後まで滑らかじゃなくても大丈夫。今日また始めたことだけで十分残っている。",
    },
    dev: {
      persona: "ペルソナ",
      timeline: "Local Timeline",
      timelineEmpty: "まだ記録なし",
    },
  },
  persona: {
    warm_friend: {
      name: "アマ",
      shortLabel: "やさしい友達型",
      description: "現実的な口調でプレッシャーを下げ、短くそばを見守る。",
    },
    fantasy_guardian: {
      name: "アマデウス",
      shortLabel: "ファンタジー守護者型",
      description: "控えめな守護者トーンで、疲れた瞬間を守るように話す。",
    },
  },
};
