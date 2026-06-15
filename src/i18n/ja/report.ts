import type { ReportMessages } from "../modules/report";

export const report: ReportMessages = {
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
  format: {
    hoursMinutes: "{hours}時間{minutes}分",
    hoursOnly: "{hours}時間",
    minutesOnly: "{minutes}分",
    zeroDuration: "0分",
    utteranceCount: "{count}回",
    zeroUtterances: "0回",
  },
};
