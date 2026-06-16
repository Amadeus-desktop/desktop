import type { AppLocale } from "../../../i18n";
import { cn } from "../../../lib/utils/cn";
import { glassStyles, shellBadgeClass, shellText } from "../../../ui/theme/shellStyles";
import type {
  PrivacyAssessment,
  ScreenCapturePermissionStatus,
} from "../../context/types";

type PerceptionStatusBarProps = {
  statusLabel: string;
  tone: "active" | "paused" | "blocked" | "error";
  enabled: boolean;
  assessment: PrivacyAssessment | null;
  permissionStatus: ScreenCapturePermissionStatus | null;
  labels: AppLocale["perception"]["privacyCard"];
};

const toneDotClass = {
  active: "bg-[color:var(--accent)] shadow-[0_0_10px_rgb(var(--accent-rgb)/0.55)]",
  paused: "bg-[color:var(--shell-ink-faint)] shadow-none",
  blocked: "bg-[color:var(--report-tone-peach)] shadow-[0_0_8px_rgb(251_146_60_/_0.35)]",
  error: "bg-[#fca5a5] shadow-[0_0_8px_rgb(252_165_165_/_0.35)]",
} as const;

export function PerceptionStatusBar({
  statusLabel,
  tone,
  enabled,
  assessment,
  permissionStatus,
  labels,
}: PerceptionStatusBarProps) {
  const sensitive = assessment?.isSensitive ?? false;
  const privacyLabel = sensitive
    ? labels.blocked
    : enabled
      ? labels.active
      : labels.inactive;

  return (
    <article
      className={cn(
        "mt-4 overflow-hidden px-3.5 py-3",
        glassStyles.radiusCard,
        "border border-[color:var(--shell-selection-border)]",
        "bg-gradient-to-br from-[color:var(--shell-selection-bg)] via-[color:var(--shell-row)] to-[color:var(--shell-panel)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn("size-2 shrink-0 rounded-full", toneDotClass[tone])}
            aria-hidden="true"
          />
          <p className={cn("text-[13px] font-medium leading-5", shellText.primary)}>
            {statusLabel}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium",
            enabled && !sensitive
              ? "border border-[color:var(--shell-selection-border)] bg-[color:var(--shell-selection-bg)] text-[color:var(--accent)]"
              : sensitive
                ? "border border-[color:var(--report-tone-peach)/0.28)] bg-[color:var(--report-tone-peach-bg)] text-[color:var(--report-tone-peach)]"
                : shellBadgeClass,
          )}
        >
          {labels.title} · {privacyLabel}
        </span>
      </div>
      <div className={cn("mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[10px] leading-4", shellText.faint)}>
        <span>
          {labels.screenPermission}:{" "}
          <span
            className={cn(
              permissionStatus?.granted
                ? "font-medium text-[color:var(--accent)]"
                : shellText.muted,
            )}
          >
            {permissionStatus?.granted
              ? labels.permissionGranted
              : labels.permissionNeeded}
          </span>
        </span>
        <span>
          {labels.sensitiveState}:{" "}
          <span
            className={
              sensitive
                ? "text-[color:var(--report-tone-peach)]"
                : "text-[color:var(--accent)]"
            }
          >
            {sensitive
              ? reasonLabel(assessment?.reason, labels)
              : labels.passed}
          </span>
        </span>
      </div>
    </article>
  );
}

function reasonLabel(
  reason: PrivacyAssessment["reason"] | undefined,
  labels: AppLocale["perception"]["privacyCard"],
) {
  return reason ? labels.reasons[reason] : labels.blocked;
}
