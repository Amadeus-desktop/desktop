import type { ReportMessages } from "../modules/report";

export const report: ReportMessages = {
  eyebrow: "Daily Review",
  title: "작업 리포트",
  description: "오늘의 집중 시간과 발화 개입 이력을 한 화면에서 확인합니다.",
  sections: {
    summary: "Summary",
    timeline: "Timeline",
  },
  metrics: {
    focusTime: "오늘 함께 달린 집중 시간",
    utterances: "companion이 건넨 넌지시 응원",
  },
  timeline: {
    loading: "타임라인을 불러오는 중입니다.",
    empty: "아직 저장된 타임라인이 없습니다.",
  },
  format: {
    hoursMinutes: "{hours}시간 {minutes}분",
    hoursOnly: "{hours}시간",
    minutesOnly: "{minutes}분",
    zeroDuration: "0분",
    utteranceCount: "{count}회",
    zeroUtterances: "0회",
  },
};
