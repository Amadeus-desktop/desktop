import type { ReportMessages } from "../modules/report";

export const report: ReportMessages = {
  eyebrow: "Daily Care",
  title: "今日を振り返る",
  description: "今日耐えた時間と、戻ってきた瞬間を一緒に確かめましょう。",
  intro: {
    prompt: "今日はよく頑張ったね。一緒に振り返ってみない？",
  },
  summaryOverlay: {
    preface: "今日もよく頑張ったね。",
    title: "今日のことを\nゆっくり確かめてみる？",
    description: "採点するのではなく、今日残った流れだけを静かにまとめています。",
    close: "一日のまとめを閉じる",
    defaultName: "きみ",
    typing: "入力中",
    status: "今日そばで見た流れ",
    replyHint: "どう返す？",
    navigation: {
      next: "次へ",
      back: "戻る",
      finish: "今日を閉じる",
    },
    stepLabels: {
      welcome: "あいさつ",
      summary: "そばで見た流れ",
      mood: "感情キーワード",
      moments: "残った跡",
      closing: "締め",
    },
    replies: {
      acknowledge: "そうだったんだ",
      continue: "うん、わかった",
      curious: "もう少し聞かせて",
      tired: "今日は少し疲れた",
      later: "ちょっと待って",
      warmClose: "ありがとう、今日もお疲れさま",
      thanksClose: "また明日ね",
    },
    steps: {
      welcome: {
        eyebrow: "Daily Care",
        title: "今日のことを\n一緒に確かめてみる？",
        description: "数字より先に、そばで見ていた流れからまとめるね。",
        cta: "見てみる",
      },
      narrative: {
        eyebrow: "そばで見た今日",
        title: "今日残った流れ",
      },
      activity: {
        eyebrow: "今日の跡",
        longStay: "長く留まった流れ",
        trace: "短く残った跡",
        kinds: {
          work: "作業",
          break: "休憩",
          unknown: "留まった場所",
        },
      },
      keywords: {
        eyebrow: "今日の感情",
        title: "今日はこんな一日だったね",
        description: "キーワードだけ軽く残しておいたよ。",
      },
      closing: {
        eyebrow: "締め",
        title: "companionから",
      },
    },
  },
  sections: {
    summary: "今日一緒にいた時間",
    moments: "今日の瞬間",
    closing: "締めのひとこと",
  },
  metrics: {
    togetherTime: "一緒にいた時間",
    nudges: "今日のNudgeNote",
    chatOpens: "チャットにつながった回数",
    returns: "戻ってきた瞬間",
  },
  emotionalKeywords: {
    title: "今日の感情キーワード",
    fallback: "静かに耐えた一日",
    tags: {
      steady: "落ち着き",
      tired: "疲れ",
      focused: "集中",
      gentle: "やさしさ",
      return: "戻ってきた",
    },
  },
  closingNote: {
    title: "companionから",
    quiet:
      "今日は静かに耐えた一日だったね。それでも一人じゃなかった — 私はそばにいたよ。",
    gentle:
      "今日もよく耐えたね。戻ってきてくれただけで、十分すごいよ。",
    active:
      "今日は忙しい一日だったね。それでも途中で話してくれてありがとう。",
  },
  timeline: {
    loading: "今日の瞬間を読み込んでいます。",
    empty: "まだ一緒にした記録がありません。",
    refresh: "更新",
    expand: "さらに{count}件表示",
    collapse: "閉じる",
  },
  format: {
    hoursMinutes: "{hours}時間{minutes}分",
    hoursOnly: "{hours}時間",
    minutesOnly: "{minutes}分",
    zeroDuration: "まだ記録なし",
    count: "{count}回",
    zeroCount: "なし",
  },
};
