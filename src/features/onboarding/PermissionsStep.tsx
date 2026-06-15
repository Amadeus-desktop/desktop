import { Monitor, ScanText } from "lucide-react";
import { useI18n } from "../../i18n";
import { Button, shellText } from "../../ui";
import { cn } from "../../lib/cn";
import { openScreenRecordingSettings } from "./openScreenRecordingSettings";
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

  return (
    <div className="relative flex w-full max-w-[16.5rem] flex-col items-center text-center">
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-28 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgb(var(--accent-rgb)/0.16),transparent_70%)] blur-2xl" />

      <p className="relative text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:rgb(var(--accent-rgb)/0.85)]">
        {t.onboarding.steps.permissions}
      </p>
      <h1 className={cn("relative mt-1.5 text-[1.1rem] font-semibold leading-snug", shellText.primary)}>
        {p.headline}
      </h1>
      <p className={cn("relative mt-2 text-[11px] leading-5", shellText.muted)}>
        {p.subheadline}
      </p>

      <ul className={cn("relative mt-3 space-y-1.5 text-left text-[10px] leading-4", shellText.faint)}>
        {p.bullets.map((bullet) => (
          <li key={bullet} className="flex gap-2">
            <span className="mt-[0.35rem] size-1 shrink-0 rounded-full bg-[color:rgb(var(--accent-rgb)/0.7)]" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>

      <div className="relative mt-3.5 w-full space-y-1.5 rounded-[14px] border border-[color:var(--shell-border-subtle)] bg-[color:var(--shell-row)] px-3 py-2.5 text-left">
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

      <div className="relative mt-4 w-full space-y-2" data-no-drag>
        {!readiness.ready ? (
          <>
            <Button
              variant="primary"
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
                "w-full py-1 text-[10px] transition hover:text-[color:var(--shell-ink)]",
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
    </div>
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
    <div className="flex items-center gap-2">
      <Icon className="size-3.5 shrink-0 text-[color:var(--shell-ink-faint)]" strokeWidth={2} />
      <span className="min-w-0 flex-1 truncate text-[10px] text-[color:var(--shell-ink-muted)]">
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
