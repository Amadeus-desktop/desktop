import { Monitor, ScanText } from "lucide-react";
import { useState } from "react";
import { useI18n } from "../../i18n";
import { cn } from "../../lib/cn";
import { Button, glassStyles, shellText } from "../../ui";
import { requestScreenCapturePermission } from "../context/contextRepository";
import { openScreenRecordingSettings } from "./openScreenRecordingSettings";
import { OnboardingStepFrame } from "./OnboardingStepFrame";
import type { PermissionReadiness } from "./types";

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

  async function handleRequestAccess() {
    if (requesting) return;
    setRequesting(true);
    try {
      await requestScreenCapturePermission();
      await onRefresh();
    } finally {
      setRequesting(false);
    }
  }

  return (
    <OnboardingStepFrame eyebrow={t.onboarding.steps.permissions} title={p.headline} description={p.subheadline}>
      <ul className={cn("mb-4 space-y-2 text-left text-[11px] leading-5", shellText.muted)}>
        {p.bullets.map((bullet) => (
          <li key={bullet} className="flex gap-2.5">
            <span className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-[color:rgb(var(--accent-rgb)/0.75)]" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>

      <div
        className={cn(
          "mb-4 space-y-2 rounded-[16px] border border-[color:var(--shell-border-subtle)] p-3",
          glassStyles.panel,
        )}
      >
        <StatusRow
          icon={Monitor}
          label={p.screenStatus}
          value={
            readiness.loading
              ? p.checking
              : readiness.screenGranted
                ? p.granted
                : p.needed
          }
          ok={readiness.screenGranted}
        />
        <StatusRow
          icon={ScanText}
          label={p.ocrStatus}
          value={
            readiness.loading
              ? p.checking
              : readiness.ocrAvailable
                ? p.granted
                : p.unavailable
          }
          ok={readiness.ocrAvailable}
        />
      </div>

      <div className="space-y-2">
        {!readiness.ready ? (
          <>
            <Button
              variant="primary"
              size="md"
              className="w-full rounded-[12px]"
              disabled={requesting || readiness.loading}
              onClick={() => void handleRequestAccess()}
            >
              {requesting ? p.checking : p.requestAccess}
            </Button>
            <Button
              variant="secondary"
              size="md"
              className="w-full rounded-[12px]"
              onClick={() => void openScreenRecordingSettings()}
            >
              {p.openSettings}
            </Button>
            <Button
              variant="secondary"
              size="md"
              className="w-full rounded-[12px]"
              disabled={readiness.loading}
              onClick={() => void onRefresh()}
            >
              {p.checkAgain}
            </Button>
            <button
              type="button"
              className={cn(
                "w-full py-1.5 text-[10px] transition hover:text-[color:var(--shell-ink)]",
                shellText.faint,
              )}
              onClick={onSkip}
            >
              {p.skip}
            </button>
          </>
        ) : (
          <Button
            variant="primary"
            size="md"
            className="w-full rounded-[12px]"
            disabled={continuing}
            onClick={onContinue}
          >
            {p.next}
          </Button>
        )}
      </div>
    </OnboardingStepFrame>
  );
}

function StatusRow({
  icon: Icon,
  label,
  value,
  ok,
}: {
  icon: typeof Monitor;
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-[12px] px-2.5 py-2",
        glassStyles.row,
      )}
    >
      <Icon className="size-4 shrink-0 text-[color:var(--shell-ink-faint)]" strokeWidth={2} />
      <span className="min-w-0 flex-1 truncate text-[11px] text-[color:var(--shell-ink-muted)]">
        {label}
      </span>
      <span
        className={cn(
          "text-[10px] font-medium",
          ok ? "text-[color:var(--accent-soft)]" : "text-[color:var(--shell-ink-faint)]",
        )}
      >
        {value}
      </span>
    </div>
  );
}
