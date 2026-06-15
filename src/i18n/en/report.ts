import type { ReportMessages } from "../modules/report";

export const report: ReportMessages = {
  eyebrow: "Daily Review",
  title: "Work report",
  description: "Today's focus time and proactive speech history in one view.",
  sections: {
    summary: "Summary",
    timeline: "Timeline",
  },
  metrics: {
    focusTime: "Focus time together today",
    utterances: "Gentle nudges from your companion",
  },
  timeline: {
    loading: "Loading timeline…",
    empty: "No timeline entries yet.",
  },
  format: {
    hoursMinutes: "{hours}h {minutes}m",
    hoursOnly: "{hours}h",
    minutesOnly: "{minutes}m",
    zeroDuration: "0m",
    utteranceCount: "{count}",
    zeroUtterances: "0",
  },
};
