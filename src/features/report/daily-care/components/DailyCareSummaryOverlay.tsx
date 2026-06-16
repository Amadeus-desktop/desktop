import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { MateIconKind } from "../../../../domain/mate";
import type { Persona } from "../../../../domain/persona/types";
import { Button, MAIN_WINDOW_OVERLAY_ROOT_ID, MainWindowTitlebarDragHandle } from "../../../../ui";
import { cn } from "../../../../lib/utils/cn";
import { useMatchMedia } from "../../../../lib/hooks/useMatchMedia";
import { PersonaPresenceIcon } from "../../../companion/ui/PersonaPresenceIcon";
import type { AppLocale } from "../../../../i18n";
import type { GeneralSettings } from "../../../settings/types";
import type { DailyCareInsight, ReportMetric, WorkTimelineItem } from "../../types";
import { useDailyCareOverlayMotion } from "../hooks/useDailyCareOverlayMotion";
import { useDailyCareMessageSession } from "../hooks/useDailyCareMessageSession";
import { dailyCareStyles } from "../ui/styles";
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
  persona: Persona;
  settings: GeneralSettings;
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
  labels,
  nickname,
  companionName,
  mateIcon,
  persona,
  settings,
  onClose,
}: DailyCareSummaryOverlayProps) {
  const prefersReducedMotion = useMatchMedia("(prefers-reduced-motion: reduce)");
  const { closing, requestClose } = useDailyCareOverlayMotion({
    onClosed: onClose,
  });
  const { messages, replies, isTyping, selectReply, submitCustomReply } = useDailyCareMessageSession({
    insight,
    metrics,
    labels,
    persona,
    settings,
    prefersReducedMotion,
    onComplete: requestClose,
  });
  const displayName = nickname.trim() || labels.summaryOverlay.defaultName;
  const scrollKey = messages.length + (isTyping ? 1 : 0);

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
        <MainWindowTitlebarDragHandle className={dailyCareStyles.titlebarDrag} />
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
            scrollKey={scrollKey}
          />

          <DailyCareReplyBar
            replies={replies}
            hint={labels.summaryOverlay.replyHint}
            customPlaceholder={labels.summaryOverlay.customReply.placeholder}
            customSendLabel={labels.summaryOverlay.customReply.send}
            disabled={isTyping}
            onSelect={selectReply}
            onCustomSubmit={submitCustomReply}
          />
        </div>
      </div>
    </section>
  );
}
