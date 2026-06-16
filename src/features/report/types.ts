export type ReportMetric = {
  id: string;
  label: string;
  value: string;
  tone: "rose" | "lavender" | "peach" | "mint";
};

export type DailyCareInsight = {
  heroPrompt: string;
  keywords: string[];
  closingNote: string;
  companionNarrative: string;
  activityDetails: DailyCareActivityDetail[];
};

export type DailyCareActivityDetail = {
  id: string;
  label: string;
  kind: "work" | "break" | "unknown";
  summary: string;
  totalDurationMs: number;
  eventCount: number;
};

export type WorkTimelineItem = {
  id: string;
  time: string;
  title: string;
  color: string;
};
