import { Heart, Sparkles } from "lucide-react";
import { useState } from "react";
import { useI18n } from "../../../i18n";
import { cn } from "../../../lib/utils/cn";
import { shellText } from "../../../ui";
import { OnboardingCtaButton, OnboardingTextButton } from "../shell/OnboardingButtons";
import { ensureScreenCapturePermission } from "../adapters/openScreenRecordingPermission";
import { OnboardingStepFrame } from "../shell/OnboardingStepFrame";
import type { PermissionReadiness } from "../types";

type PermissionsStepProps = {
  readiness: PermissionReadiness;
  onRefresh: () => Promise<void>;
  onContinue: () => void;
  onSkip: () => void;
  continuing?: boolean;
};

export function PermissionsStep({
  readiness,
  onRefresh,
  onContinue,
  onSkip,
  continuing = false,
}: PermissionsStepProps) {
  const t = useI18n();
  const p = t.onboarding.permissions;
  const [requesting, setRequesting] = useState(false);
  const [requestFailed, setRequestFailed] = useState(false);

  const statusLabel = readiness.loading
    ? p.checking
    : readiness.screenGranted
      ? p.granted
      : p.needed;

  async function handleAllow() {
    if (requesting || readiness.loading) return;
    setRequesting(true);
    setRequestFailed(false);
    try {
      const granted = await ensureScreenCapturePermission();
      setRequestFailed(!granted);
      await onRefresh();
    } finally {
      setRequesting(false);
    }
  }

  return (
    <OnboardingStepFrame
      compact
      eyebrow={t.onboarding.steps.permissions}
      title={p.headline}
      description={p.subheadline}
    >
      <div className="space-y-3">
        <div
          className="rounded-[16px] border border-[color:rgb(var(--accent-rgb)/0.18)] bg-[color:rgb(var(--accent-rgb)/0.06)] px-3.5 py-3"
        >
          <div className="flex flex-wrap justify-center gap-2">
            {p.promiseChips.map((chip) => (
              <span
                key={chip}
                className="inline-flex items-center gap-1 rounded-full border border-[color:rgb(var(--accent-rgb)/0.22)] bg-[color:rgb(var(--accent-rgb)/0.1)] px-2.5 py-1 text-[10px] font-medium text-[color:var(--accent-soft)]"
              >
                <Sparkles className="size-3 shrink-0 opacity-80" strokeWidth={2} />
                {chip}
              </span>
            ))}
          </div>
        </div>

        <div
          className={cn(
            "flex items-center justify-between gap-2 rounded-[14px] border px-3 py-2",
            readiness.screenGranted
              ? "border-[color:rgb(var(--accent-rgb)/0.28)] bg-[color:rgb(var(--accent-rgb)/0.08)]"
              : "border-[color:var(--shell-border-subtle)] bg-[color:var(--shell-panel-strong)]",
          )}
        >
          <span className="flex items-center gap-2 min-w-0">
            <Heart
              className={cn(
                "size-3.5 shrink-0",
                readiness.screenGranted
                  ? "text-[color:var(--accent-soft)]"
                  : "text-[color:var(--shell-ink-faint)]",
              )}
              strokeWidth={2}
            />
            <span className={cn("truncate text-[11px]", shellText.muted)}>{p.statusLabel}</span>
          </span>
          <span
            className={cn(
              "shrink-0 text-[10px] font-semibold",
              readiness.screenGranted
                ? "text-[color:var(--accent-soft)]"
                : "text-[color:var(--shell-ink-faint)]",
            )}
          >
            {statusLabel}
          </span>
        </div>

        {readiness.ready ? (
          <OnboardingCtaButton disabled={continuing} onClick={onContinue}>
            {p.next}
          </OnboardingCtaButton>
        ) : (
          <>
            <OnboardingCtaButton loading={requesting} onClick={() => void handleAllow()}>
              {p.requestAccess}
            </OnboardingCtaButton>
            <p className={cn("text-center text-[10px] leading-relaxed", shellText.faint)}>
              {requestFailed ? p.requestFailed : p.settingsHint}
            </p>
          </>
        )}

        <div className="flex justify-center pt-0.5">
          <OnboardingTextButton onClick={onSkip}>{p.skip}</OnboardingTextButton>
        </div>
      </div>
    </OnboardingStepFrame>
  );
}
