import { useState } from "react";
import { useI18n } from "../../i18n";
import { cn } from "../../lib/cn";
import { GoogleSignInButton } from "../auth/GoogleSignInButton";
import { OnboardingStepFrame } from "./OnboardingStepFrame";

type LoginStepProps = {
  onGoogleSignIn: () => Promise<unknown>;
};

export function LoginStep({ onGoogleSignIn }: LoginStepProps) {
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
    <OnboardingStepFrame
      eyebrow={t.common.appName}
      title={t.auth.onboarding.headline}
      description={t.auth.onboarding.subheadline}
    >
      <div className="relative flex flex-col items-center">
        <div
          className={cn(
            "mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] border border-[color:rgb(var(--accent-rgb)/0.35)] bg-[color:rgb(var(--accent-rgb)/0.12)] text-xl font-semibold text-[color:var(--accent-soft)] shadow-[0_10px_32px_rgb(var(--accent-rgb)/0.16)]",
          )}
        >
          A
        </div>

        <GoogleSignInButton
          label={t.auth.onboarding.googleButton}
          loading={loading}
          onClick={() => void handleSignIn()}
        />
        <p className="mt-2.5 text-center text-[10px] leading-4 text-[color:var(--shell-ink-faint)]">
          {t.auth.onboarding.footnote}
        </p>
      </div>
    </OnboardingStepFrame>
  );
}
