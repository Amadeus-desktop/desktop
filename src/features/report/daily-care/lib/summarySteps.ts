import type { DailyCareActivityDetail, DailyCareInsight } from "../../types";

export type DailyCareSummaryStep =
  | { kind: "welcome"; id: "welcome" }
  | { kind: "narrative"; id: "narrative"; narrative: string }
  | { kind: "activity"; id: string; activity: DailyCareActivityDetail }
  | { kind: "keywords"; id: "keywords"; keywords: string[] }
  | { kind: "closing"; id: "closing"; closingNote: string };

export type DailyCareSummaryPhase =
  | "welcome"
  | "summary"
  | "mood"
  | "moments"
  | "closing";

const MAX_ACTIVITIES = 4;

export function buildDailyCareSummarySteps(
  _metrics: unknown[],
  _moments: unknown[],
  insight: DailyCareInsight,
): DailyCareSummaryStep[] {
  const steps: DailyCareSummaryStep[] = [{ kind: "welcome", id: "welcome" }];

  if (insight.companionNarrative.trim()) {
    steps.push({
      kind: "narrative",
      id: "narrative",
      narrative: insight.companionNarrative,
    });
  }

  for (const activity of insight.activityDetails.slice(0, MAX_ACTIVITIES)) {
    steps.push({ kind: "activity", id: activity.id, activity });
  }

  steps.push({
    kind: "keywords",
    id: "keywords",
    keywords: insight.keywords,
  });

  steps.push({
    kind: "closing",
    id: "closing",
    closingNote: insight.closingNote,
  });

  return steps;
}

export function getDailyCareSummaryPhase(
  step: DailyCareSummaryStep,
): DailyCareSummaryPhase {
  switch (step.kind) {
    case "welcome":
      return "welcome";
    case "narrative":
      return "summary";
    case "activity":
      return "moments";
    case "keywords":
      return "mood";
    case "closing":
      return "closing";
  }
}

export const DAILY_CARE_SUMMARY_PHASES: DailyCareSummaryPhase[] = [
  "welcome",
  "summary",
  "mood",
  "moments",
  "closing",
];
