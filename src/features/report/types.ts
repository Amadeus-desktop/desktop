export type ReportMetric = {
  id: string;
  label: string;
  value: string;
  tone: "rose" | "lavender" | "peach" | "mint";
};

export type DailyCareInsight = {
  keywords: string[];
  closingNote: string;
};

export type WorkTimelineItem = {
  id: string;
  time: string;
  title: string;
  color: string;
};
