import { useCallback } from "react";
import { createUserReaction } from "../../timeline";
import { recordTriggerReactionForScoring } from "../../trigger";

export function useCompanionReactions(
  activeUtteranceId: string | null,
  refreshTimeline: () => void,
) {
  const recordReaction = useCallback(
    async (reactionType: string, options?: { score?: boolean }) => {
      await createUserReaction({
        reactionType,
        utteranceEventId: activeUtteranceId,
      });
      if (options?.score !== false) {
        await recordTriggerReactionForScoring(reactionType);
      }
      refreshTimeline();
    },
    [activeUtteranceId, refreshTimeline],
  );

  return { recordReaction };
}
