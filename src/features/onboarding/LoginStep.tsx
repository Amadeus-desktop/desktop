import { useState } from "react";
import { useI18n } from "../../i18n";
import { shellText } from "../../ui";
import { cn } from "../../lib/cn";
import { GoogleSignInButton } from "../auth/GoogleSignInButton";

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
    <div className="relative flex w-full max-w-[15rem] flex-col items-center text-center">
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-28 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgb(var(--accent-rgb)/0.18),transparent_70%)] blur-2xl" />

      <div
        className={cn(
          "relative mb-3.5 flex h-12 w-12 items-center justify-center rounded-[16px] border border-[color:rgb(var(--accent-rgb)/0.35)] bg-[color:rgb(var(--accent-rgb)/0.14)] text-lg font-semibold text-[color:var(--accent-soft)] shadow-[0_8px_28px_rgb(var(--accent-rgb)/0.14)]",
        )}
      >
        A
      </div>

      <p className="relative text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:rgb(var(--accent-rgb)/0.85)]">
        {t.common.appName}
      </p>
      <h1
        className={cn(
          "relative mt-1.5 text-[1.15rem] font-semibold leading-snug tracking-[-0.02em]",
          shellText.primary,
        )}
      >
        {t.auth.onboarding.headline}
      </h1>
      <p className={cn("relative mt-2 text-[11px] leading-5", shellText.muted)}>
        {t.auth.onboarding.subheadline}
      </p>

      <div className="relative mt-4 w-full" data-no-drag>
        <GoogleSignInButton
          label={t.auth.onboarding.googleButton}
          loading={loading}
          onClick={() => void handleSignIn()}
        />
        <p className={cn("mt-2 text-[9px] leading-4", shellText.faint)}>
          {t.auth.onboarding.footnote}
        </p>
      </div>
    </div>
  );
}
