import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button, MAIN_WINDOW_OVERLAY_ROOT_ID } from "../../../ui";
import { cn } from "../../../lib/utils/cn";
import {
  OnboardingCtaButton,
  OnboardingTextButton,
} from "../../onboarding/shell/OnboardingButtons";
import type { AppLocale } from "../../../i18n";
import {
  buildDailyCareSummarySteps,
  getDailyCareSummaryPhase,
  type DailyCareSummaryStep,
} from "../lib/dailyCareSummarySteps";
import type { DailyCareInsight, ReportMetric, WorkTimelineItem } from "../types";
import { useDailyCareOverlayMotion } from "../hooks/useDailyCareOverlayMotion";
import { dailyCareStyles } from "../ui/reportStyles";
import { DailyCareSummaryProgress } from "./DailyCareSummaryProgress";
import { DailyCareSummaryStepFrame } from "./DailyCareSummaryStepFrame";

type DailyCareSummaryOverlayProps = {
  insight: DailyCareInsight;
  metrics: ReportMetric[];
  moments: WorkTimelineItem[];
  labels: AppLocale["report"];
  nickname: string;
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
  onClose,
}: DailyCareSummaryOverlayProps) {
  const steps = useMemo(
    () => buildDailyCareSummarySteps(metrics, moments, insight),
    [insight, metrics, moments],
  );
  const [stepIndex, setStepIndex] = useState(0);
  const { closing, prefersReducedMotion, requestClose } = useDailyCareOverlayMotion({
    onClosed: onClose,
  });
  const currentStep = steps[stepIndex] ?? steps[0];
  const currentPhase = getDailyCareSummaryPhase(currentStep);
  const isLastStep = stepIndex >= steps.length - 1;

  useEffect(() => {
    document.documentElement.dataset.dailyCareOverlay = "open";
    return () => {
      delete document.documentElement.dataset.dailyCareOverlay;
    };
  }, []);

  function goNext() {
    if (isLastStep) {
      requestClose();
      return;
    }
    setStepIndex((index) => Math.min(index + 1, steps.length - 1));
  }

  function goBack() {
    setStepIndex((index) => Math.max(index - 1, 0));
  }

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
        <div className={dailyCareStyles.sheetGradient} />
        <div className={dailyCareStyles.sheetGlow} />

        <header className={dailyCareStyles.header}>
          <div>
            <p className={dailyCareStyles.headerEyebrow}>{labels.eyebrow}</p>
            <h2 className={dailyCareStyles.headerTitle}>{labels.title}</h2>
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

        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className={dailyCareStyles.body}>
            <DailyCareSummaryStepPanel
              step={currentStep}
              prefersReducedMotion={prefersReducedMotion}
            >
              <DailyCareSummaryStepContent
                step={currentStep}
                labels={labels}
              />
            </DailyCareSummaryStepPanel>
          </div>

          <DailyCareSummaryProgress
            currentPhase={currentPhase}
            phaseLabels={labels.summaryOverlay.stepLabels}
          />

          <div className={dailyCareStyles.footer}>
            <div className={dailyCareStyles.footerActions}>
              <OnboardingCtaButton onClick={goNext}>
                {isLastStep
                  ? labels.summaryOverlay.navigation.finish
                  : stepIndex === 0
                    ? labels.summaryOverlay.steps.welcome.cta
                    : labels.summaryOverlay.navigation.next}
              </OnboardingCtaButton>
              {stepIndex > 0 ? (
                <OnboardingTextButton onClick={goBack}>
                  {labels.summaryOverlay.navigation.back}
                </OnboardingTextButton>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DailyCareSummaryStepPanel({
  step,
  prefersReducedMotion,
  children,
}: {
  step: DailyCareSummaryStep;
  prefersReducedMotion: boolean;
  children: ReactNode;
}) {
  return (
    <div
      key={step.id}
      className={cn(
        "w-full",
        !prefersReducedMotion && "motion-safe-animate animate-onboarding-step-enter",
      )}
    >
      {children}
    </div>
  );
}

function DailyCareSummaryStepContent({
  step,
  labels,
}: {
  step: DailyCareSummaryStep;
  labels: AppLocale["report"];
}) {
  switch (step.kind) {
    case "welcome":
      return (
        <DailyCareSummaryStepFrame
          eyebrow={labels.summaryOverlay.steps.welcome.eyebrow}
          title={labels.summaryOverlay.steps.welcome.title}
          description={labels.summaryOverlay.steps.welcome.description}
        />
      );
    case "narrative":
      return (
        <DailyCareSummaryStepFrame
          eyebrow={labels.summaryOverlay.steps.narrative.eyebrow}
          title={labels.summaryOverlay.steps.narrative.title}
          description={step.narrative}
        />
      );
    case "activity":
      return (
        <DailyCareSummaryStepFrame
          eyebrow={labels.summaryOverlay.steps.activity.eyebrow}
          title={step.activity.label}
          description={step.activity.summary}
          compact
        >
          <ActivityDetailCard step={step} labels={labels} />
        </DailyCareSummaryStepFrame>
      );
    case "keywords":
      return (
        <DailyCareSummaryStepFrame
          eyebrow={labels.summaryOverlay.steps.keywords.eyebrow}
          title={labels.summaryOverlay.steps.keywords.title}
          description={labels.summaryOverlay.steps.keywords.description}
          compact
        >
          <div className="flex flex-wrap justify-center gap-2">
            {step.keywords.map((keyword) => (
              <span key={keyword} className={dailyCareStyles.keywordChip}>
                {keyword}
              </span>
            ))}
          </div>
        </DailyCareSummaryStepFrame>
      );
    case "closing":
      return (
        <DailyCareSummaryStepFrame
          eyebrow={labels.summaryOverlay.steps.closing.eyebrow}
          title={labels.summaryOverlay.steps.closing.title}
          description={step.closingNote}
        />
      );
  }
}

function ActivityDetailCard({
  step,
  labels,
}: {
  step: Extract<DailyCareSummaryStep, { kind: "activity" }>;
  labels: AppLocale["report"];
}) {
  const stayLabel =
    step.activity.totalDurationMs >= 45 * 60 * 1000
      ? labels.summaryOverlay.steps.activity.longStay
      : labels.summaryOverlay.steps.activity.trace;
  const kindLabel = labels.summaryOverlay.steps.activity.kinds[step.activity.kind];

  return (
    <div className={dailyCareStyles.momentCard}>
      <span
        className={cn(
          "h-2.5 w-2.5 shrink-0 rounded-full",
          step.activity.kind === "work"
            ? "bg-[color:var(--report-tone-mint-soft)]"
            : step.activity.kind === "break"
              ? "bg-[color:var(--report-tone-peach-soft)]"
              : "bg-[color:var(--shell-ink-faint)]",
        )}
      />
      <span className={dailyCareStyles.momentTime}>{kindLabel}</span>
      <span className="ml-auto text-[12px] text-[color:var(--shell-ink-muted)]">
        {stayLabel}
      </span>
    </div>
  );
}
