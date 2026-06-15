import { useState } from "react";
import { useI18n } from "../../../i18n";
import { animateMainWindowToControlCenter } from "../../auth/lib/mainWindowLayout";
import { useAuth } from "../../auth/hooks/useAuth";
import { usePermissionReadiness } from "../hooks/usePermissionReadiness";
import { OnboardingShell } from "../shell/OnboardingShell";
import { LoginStep } from "../steps/LoginStep";
import { PermissionsStep } from "../steps/PermissionsStep";
import { ModelRouteStep } from "../steps/ModelRouteStep";
import { SetupStep } from "../steps/SetupStep";
import type { OnboardingStep } from "../../../domain/onboarding";

type OnboardingFlowProps = {
  currentStep: OnboardingStep;
  stepOrder: readonly OnboardingStep[];
  markPermissionsDone: () => void;
  markModelRouteDone: () => void;
  markSetupDone: () => void;
};

export function OnboardingFlow({
  currentStep,
  stepOrder,
  markPermissionsDone,
  markModelRouteDone,
  markSetupDone,
}: OnboardingFlowProps) {
  const t = useI18n();
  const { isAuthenticated, signInWithGoogle, logoutTransitioning } = useAuth();
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
        <LoginStep
          onGoogleSignIn={signInWithGoogle}
          loggingOut={logoutTransitioning}
        />
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

      {currentStep === "modelRoute" ? (
        <ModelRouteStep
          onContinue={markModelRouteDone}
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
