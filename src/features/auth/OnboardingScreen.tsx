import { useState } from "react";
import { useI18n } from "../../i18n";
import { MacWindow, shellText } from "../../ui";
import { cn } from "../../lib/cn";
import { GoogleSignInButton } from "./GoogleSignInButton";

type OnboardingScreenProps = {
  onGoogleSignIn: () => Promise<unknown>;
};

export function OnboardingScreen({ onGoogleSignIn }: OnboardingScreenProps) {
  const t = useI18n();
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (loading) return;
    setLoading(true);
    try {
      await onGoogleSignIn();
    } finally {
      setLoading(false);
    }
  }

  return (
    <MacWindow variant="onboarding">
      <div
        data-tauri-drag-region
        className="relative flex h-full min-h-0 flex-col px-7 py-8 max-sm:px-5 max-sm:py-6"
      >
        <div className="pointer-events-none absolute inset-x-8 top-16 h-40 rounded-full bg-[radial-gradient(circle_at_center,rgb(var(--accent-rgb)/0.22),transparent_70%)] blur-2xl" />

        <div className="relative flex flex-1 flex-col items-center justify-center text-center">
          <div
            className={cn(
              "mb-7 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[22px] border border-[color:rgb(var(--accent-rgb)/0.35)] bg-[color:rgb(var(--accent-rgb)/0.14)] text-2xl font-semibold text-[color:var(--accent-soft)] shadow-[0_12px_40px_rgb(var(--accent-rgb)/0.18)]",
            )}
          >
            A
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:rgb(var(--accent-rgb)/0.85)]">
            {t.common.appName}
          </p>
          <h1
            className={cn(
              "mt-3 max-w-[16rem] text-[1.65rem] font-semibold leading-[1.25] tracking-[-0.02em]",
              shellText.primary,
            )}
          >
            {t.auth.onboarding.headline}
          </h1>
          <p
            className={cn(
              "mt-3 max-w-[18rem] text-[13px] leading-6",
              shellText.muted,
            )}
          >
            {t.auth.onboarding.subheadline}
          </p>
          <p className={cn("mt-2 max-w-[18rem] text-xs leading-5", shellText.faint)}>
            {t.auth.onboarding.body}
          </p>
        </div>

        <div className="app-no-drag relative shrink-0 space-y-3 pb-1">
          <GoogleSignInButton
            label={t.auth.onboarding.googleButton}
            loading={loading}
            onClick={() => void handleSignIn()}
          />
          <p className={cn("px-1 text-center text-[10px] leading-4", shellText.faint)}>
            {t.auth.onboarding.footnote}
          </p>
        </div>
      </div>
    </MacWindow>
  );
}
