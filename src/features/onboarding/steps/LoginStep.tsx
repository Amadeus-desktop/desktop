import { useState } from "react";
import { useI18n } from "../../../i18n";
import { GoogleSignInButton } from "../../auth/components/GoogleSignInButton";
import { OnboardingStepFrame } from "../shell/OnboardingStepFrame";

type LoginStepProps = {
  onGoogleSignIn: () => Promise<unknown>;
  loggingOut?: boolean;
};

export function LoginStep({ onGoogleSignIn, loggingOut = false }: LoginStepProps) {
  const t = useI18n();
  const [loading, setLoading] = useState(false);
  const busy = loading || loggingOut;

  async function handleSignIn() {
    if (busy) return;
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
      <div className="relative w-full pt-1">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 left-1/2 h-28 w-28 -translate-x-1/2 rounded-full bg-[color:rgb(var(--accent-rgb)/0.14)] blur-3xl"
        />

        <GoogleSignInButton
          variant="link"
          label={
            loggingOut
              ? t.auth.account.loggingOut
              : t.auth.onboarding.googleButton
          }
          loading={busy}
          disabled={loggingOut}
          onClick={() => void handleSignIn()}
        />
        <p className="mt-3 text-center text-[11px] leading-relaxed text-[color:var(--shell-ink-faint)]">
          {t.auth.onboarding.footnote}
        </p>
      </div>
    </OnboardingStepFrame>
  );
}
