import { useState } from "react";
import { useI18n } from "../../i18n";
import { animateMainWindowToControlCenter } from "../auth/mainWindowLayout";
import { useAuth } from "../auth/useAuth";
import { LoginStep } from "./LoginStep";
import { OnboardingShell } from "./OnboardingShell";
import { PermissionsStep } from "./PermissionsStep";
import { SetupStep } from "./SetupStep";
import { usePermissionReadiness } from "./usePermissionReadiness";
import type { OnboardingStep } from "./types";

type OnboardingFlowProps = {
  currentStep: OnboardingStep;
  stepOrder: readonly OnboardingStep[];
  markPermissionsDone: () => void;
  markSetupDone: () => void;
};

export function OnboardingFlow({
  currentStep,
  stepOrder,
  markPermissionsDone,
  markSetupDone,
}: OnboardingFlowProps) {
  const t = useI18n();
  const { isAuthenticated, signInWithGoogle } = useAuth();
  const readiness = usePermissionReadiness(
    isAuthenticated && currentStep === "permissions",
  );
  const [continuing, setContinuing] = useState(false);

  const stepLabels = stepOrder.map((step) => t.onboarding.steps[step]);

  async function finishOnboarding() {
    if (continuing) return;
    setContinuing(true);
    try {
      try {
        await animateMainWindowToControlCenter();
      } catch {
        // Window animation is best-effort; onboarding still completes below.
      }
    } finally {
      markSetupDone();
      setContinuing(false);
    }
  }

  return (
    <OnboardingShell step={currentStep} stepLabels={stepLabels}>
      {currentStep === "login" ? (
        <LoginStep onGoogleSignIn={signInWithGoogle} />
      ) : null}

      {currentStep === "permissions" ? (
        <PermissionsStep
          readiness={readiness}
          onRefresh={readiness.refresh}
          onContinue={markPermissionsDone}
          onSkip={markPermissionsDone}
          continuing={continuing}
        />
      ) : null}

      {currentStep === "setup" ? (
        <SetupStep
          onComplete={() => void finishOnboarding()}
          continuing={continuing}
        />
      ) : null}
    </OnboardingShell>
  );
}
