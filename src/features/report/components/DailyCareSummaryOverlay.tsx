import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { MateIconKind } from "../../../domain/mate";
import { Button, MAIN_WINDOW_OVERLAY_ROOT_ID } from "../../../ui";
import { cn } from "../../../lib/utils/cn";
import { useChatAutoScroll } from "../../companion/chat/hooks/useChatAutoScroll";
import { PersonaPresenceIcon } from "../../companion/ui/PersonaPresenceIcon";
import type { AppLocale } from "../../../i18n";
import { buildDailyCareSummarySteps } from "../lib/dailyCareSummarySteps";
import { buildDailyCareTurns } from "../lib/dailyCareMessageScript";
import type { DailyCareInsight, ReportMetric, WorkTimelineItem } from "../types";
import { useDailyCareOverlayMotion } from "../hooks/useDailyCareOverlayMotion";
import { useDailyCareMessageSession } from "../hooks/useDailyCareMessageSession";
import { dailyCareStyles } from "../ui/reportStyles";
import { DailyCareMessageThread } from "./DailyCareMessageThread";
import { DailyCareReplyBar } from "./DailyCareReplyBar";

type DailyCareSummaryOverlayProps = {
  insight: DailyCareInsight;
  metrics: ReportMetric[];
  moments: WorkTimelineItem[];
  labels: AppLocale["report"];
  nickname: string;
  companionName: string;
  mateIcon: MateIconKind;
  onClose: () => void;
};

export function DailyCareSummaryOverlay(props: DailyCareSummaryOverlayProps) {
  const portalTarget =
    typeof document !== "undefined"
      ? document.getElementById(MAIN_WINDOW_OVERLAY_ROOT_ID)
      : null;

  if (!portalTarget) {
    return null;
  }

  return createPortal(<DailyCareSummaryOverlayContent {...props} />, portalTarget);
}

function DailyCareSummaryOverlayContent({
  insight,
  metrics,
  moments,
  labels,
  nickname,
  companionName,
  mateIcon,
  onClose,
}: DailyCareSummaryOverlayProps) {
  const steps = useMemo(
    () => buildDailyCareSummarySteps(metrics, moments, insight),
    [insight, metrics, moments],
  );
  const turns = useMemo(() => buildDailyCareTurns(steps, labels), [labels, steps]);
  const { closing, prefersReducedMotion, requestClose } = useDailyCareOverlayMotion({
    onClosed: onClose,
  });
  const { messages, replies, isTyping, selectReply } = useDailyCareMessageSession({
    turns,
    prefersReducedMotion,
    onComplete: requestClose,
  });
  const bodyRef = useChatAutoScroll(messages.length + (isTyping ? 1 : 0));
  const displayName = nickname.trim() || labels.summaryOverlay.defaultName;

  useEffect(() => {
    document.documentElement.dataset.dailyCareOverlay = "open";
    return () => {
      delete document.documentElement.dataset.dailyCareOverlay;
    };
  }, []);

  return (
    <section
      className={dailyCareStyles.overlay}
      aria-live="polite"
      aria-hidden={closing && prefersReducedMotion}
    >
      <div
        className={cn(
          dailyCareStyles.scrim,
          !prefersReducedMotion && (closing ? dailyCareStyles.scrimExit : dailyCareStyles.scrimEnter),
        )}
      />

      <div
        className={cn(
          dailyCareStyles.sheet,
          !prefersReducedMotion && (closing ? dailyCareStyles.sheetExit : dailyCareStyles.sheetEnter),
        )}
      >
        <div className={dailyCareStyles.messageShell}>
          <header className={dailyCareStyles.messageHeader}>
            <div className={dailyCareStyles.messageAvatar}>
              <PersonaPresenceIcon
                kind={mateIcon}
                accentSource="settings"
                size="sm"
                variant="filled"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className={dailyCareStyles.messageTitle}>{companionName}</p>
              <p className={dailyCareStyles.messageStatus}>{labels.summaryOverlay.status}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className={dailyCareStyles.closeButton}
              onClick={requestClose}
              aria-label={labels.summaryOverlay.close}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </header>

          <DailyCareMessageThread
            messages={messages}
            companionName={companionName}
            mateIcon={mateIcon}
            userName={displayName}
            isTyping={isTyping}
            labels={labels}
            bodyRef={bodyRef}
          />

          <DailyCareReplyBar replies={replies} onSelect={selectReply} />
        </div>
      </div>
    </section>
  );
}
