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
        className="onboarding-enter relative flex h-full min-h-0 flex-col px-5 py-7 max-sm:px-4 max-sm:py-6"
      >
        <div className="pointer-events-none absolute inset-x-6 top-14 h-36 rounded-full bg-[radial-gradient(circle_at_center,rgb(var(--accent-rgb)/0.22),transparent_70%)] blur-2xl" />

        <div className="relative flex flex-1 flex-col items-center justify-center text-center">
          <div
            className={cn(
              "mb-6 flex h-16 w-16 items-center justify-center rounded-[20px] border border-[color:rgb(var(--accent-rgb)/0.35)] bg-[color:rgb(var(--accent-rgb)/0.14)] text-[1.35rem] font-semibold text-[color:var(--accent-soft)] shadow-[0_12px_40px_rgb(var(--accent-rgb)/0.18)]",
            )}
          >
            A
          </div>

          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:rgb(var(--accent-rgb)/0.85)]">
            {t.common.appName}
          </p>
          <h1
            className={cn(
              "mt-2.5 max-w-[15rem] text-[1.45rem] font-semibold leading-[1.28] tracking-[-0.02em]",
              shellText.primary,
            )}
          >
            {t.auth.onboarding.headline}
          </h1>
          <p
            className={cn(
              "mt-3 max-w-[16rem] text-[12px] leading-[1.65]",
              shellText.muted,
            )}
          >
            {t.auth.onboarding.subheadline}
          </p>
          <p className={cn("mt-2 max-w-[16rem] text-[11px] leading-5", shellText.faint)}>
            {t.auth.onboarding.body}
          </p>
        </div>

        <div className="app-no-drag relative shrink-0 space-y-2.5 pb-0.5">
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
