import type { AppLocale } from "../../../i18n";
import type { DailyCareActivityDetail } from "../types";
import type { DailyCareSummaryStep } from "./dailyCareSummarySteps";

export type DailyCareThreadMessage =
  | {
      id: string;
      sender: "companion" | "user";
      kind: "text";
      text: string;
    }
  | {
      id: string;
      sender: "companion";
      kind: "keywords";
      lead: string;
      keywords: string[];
    }
  | {
      id: string;
      sender: "companion";
      kind: "activity";
      lead: string;
      activity: DailyCareActivityDetail;
    };

export type DailyCareReply = {
  id: string;
  label: string;
};

export type DailyCareTurn = {
  id: string;
  companionItems: DailyCareThreadMessage[];
  replies: DailyCareReply[];
};

export function splitCompanionBubbles(text: string): string[] {
  return text
    .split(/\n+/)
    .flatMap((paragraph) =>
      paragraph
        .split(/(?<=[.!?…])\s+/)
        .map((part) => part.trim())
        .filter(Boolean),
    );
}

export function buildDailyCareTurns(
  steps: DailyCareSummaryStep[],
  labels: AppLocale["report"],
): DailyCareTurn[] {
  const { summaryOverlay: overlay } = labels;

  return steps.map((step) => {
    const continueLabel = overlay.navigation.next;
    const finishLabel = overlay.navigation.finish;

    switch (step.kind) {
      case "welcome":
        return {
          id: step.id,
          companionItems: [
            ...splitCompanionBubbles(overlay.steps.welcome.title).map((text, bubbleIndex) =>
              textMessage(`${step.id}-title-${bubbleIndex}`, text),
            ),
            textMessage(`${step.id}-detail`, overlay.steps.welcome.description),
          ],
          replies: [{ id: "start", label: overlay.steps.welcome.cta }],
        };
      case "narrative":
        return {
          id: step.id,
          companionItems: [
            textMessage(`${step.id}-lead`, overlay.steps.narrative.title),
            ...splitCompanionBubbles(step.narrative).map((text, bubbleIndex) =>
              textMessage(`${step.id}-${bubbleIndex}`, text),
            ),
          ],
          replies: [{ id: "continue", label: continueLabel }],
        };
      case "activity":
        return {
          id: step.id,
          companionItems: [
            {
              id: `${step.id}-card`,
              sender: "companion",
              kind: "activity",
              lead: step.activity.summary,
              activity: step.activity,
            },
          ],
          replies: [{ id: "continue", label: continueLabel }],
        };
      case "keywords":
        return {
          id: step.id,
          companionItems: [
            {
              id: `${step.id}-keywords`,
              sender: "companion",
              kind: "keywords",
              lead: overlay.steps.keywords.description,
              keywords: step.keywords,
            },
          ],
          replies: [{ id: "continue", label: overlay.replies.acknowledge }],
        };
      case "closing":
        return {
          id: step.id,
          companionItems: splitCompanionBubbles(step.closingNote).map((text, bubbleIndex) =>
            textMessage(`${step.id}-${bubbleIndex}`, text),
          ),
          replies: [{ id: "finish", label: finishLabel }],
        };
    }
  });
}

function textMessage(id: string, text: string): DailyCareThreadMessage {
  return {
    id,
    sender: "companion",
    kind: "text",
    text,
  };
}
