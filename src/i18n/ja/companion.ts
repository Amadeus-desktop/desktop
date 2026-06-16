import type { CompanionMessages } from "../modules/companion";

export const companion: CompanionMessages = {
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
    closingMessage: "最後まで滑らかじゃなくても大丈夫。今日また始めたことだけで十分残っている。",
  },
  dev: {
    mate: "メイト",
    timeline: "Local Timeline",
    timelineEmpty: "まだ記録なし",
  },
};
