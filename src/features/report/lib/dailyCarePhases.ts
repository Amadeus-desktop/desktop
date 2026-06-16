import type { DailyCareActivityDetail, DailyCareInsight } from "../types";

const MAX_ACTIVITIES = 4;

export type DailyCarePhase =
  | { kind: "welcome" }
  | { kind: "summary"; narrative: string }
  | { kind: "activity"; activity: DailyCareActivityDetail }
  | { kind: "keywords"; keywords: string[] }
  | { kind: "closing"; closingNote: string };

export function buildDailyCarePhases(insight: DailyCareInsight): DailyCarePhase[] {
  const phases: DailyCarePhase[] = [{ kind: "welcome" }];

  if (insight.companionNarrative.trim()) {
    phases.push({ kind: "summary", narrative: insight.companionNarrative });
  }

  for (const activity of insight.activityDetails.slice(0, MAX_ACTIVITIES)) {
    phases.push({ kind: "activity", activity });
  }

  phases.push({ kind: "keywords", keywords: insight.keywords });
  phases.push({ kind: "closing", closingNote: insight.closingNote });

  return phases;
}
