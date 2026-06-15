import type { AppLocale } from "../../../i18n";
import { cn } from "../../../lib/utils/cn";
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
  paused: "bg-white/35 shadow-none",
  blocked: "bg-[#fdba74] shadow-[0_0_8px_rgb(253_186_116_/_0.4)]",
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
    <article className="mt-4 overflow-hidden rounded-[18px] border border-[color:rgb(var(--accent-rgb)/0.18)] bg-gradient-to-br from-[color:rgb(var(--accent-rgb)/0.10)] via-[#222226] to-[#222226] px-3.5 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn("size-2 shrink-0 rounded-full", toneDotClass[tone])}
            aria-hidden="true"
          />
          <p className="text-[13px] font-medium leading-5 text-[color:var(--accent-soft)]">
            {statusLabel}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium",
            enabled && !sensitive
              ? "border border-[color:rgb(var(--accent-rgb)/0.28)] bg-[color:rgb(var(--accent-rgb)/0.12)] text-[color:var(--accent-soft)]"
              : sensitive
                ? "border border-[#fdba74]/28 bg-[#fdba74]/12 text-[#fed7aa]"
                : "border border-[#48484f] bg-[#2c2c30] text-white/45",
          )}
        >
          {labels.title} · {privacyLabel}
        </span>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[10px] leading-4 text-white/42">
        <span>
          {labels.screenPermission}:{" "}
          <span className={permissionStatus?.granted ? "text-[color:var(--accent-soft)]" : "text-white/55"}>
            {permissionStatus?.granted
              ? labels.permissionGranted
              : labels.permissionNeeded}
          </span>
        </span>
        <span>
          {labels.sensitiveState}:{" "}
          <span className={sensitive ? "text-[#fed7aa]" : "text-[color:var(--accent-soft)]"}>
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
