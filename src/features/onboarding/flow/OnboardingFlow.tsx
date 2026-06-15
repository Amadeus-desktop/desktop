import { useState } from "react";
import { useI18n } from "../../../i18n";
import { animateMainWindowToControlCenter } from "../../auth/lib/mainWindowLayout";
import { LogoutTransitionStep } from "../../auth/components/LogoutTransitionStep";
import { useAuth } from "../../auth/hooks/useAuth";
import { usePermissionReadiness } from "../hooks/usePermissionReadiness";
import {
  ONBOARDING_COMPLETE_DELAY_MS,
  ONBOARDING_PREPARE_DELAY_MS,
  sleep,
} from "../lib/transitionTiming";
import { OnboardingShell } from "../shell/OnboardingShell";
import { LoginStep } from "../steps/LoginStep";
import { PermissionsStep } from "../steps/PermissionsStep";
import { ModelRouteStep } from "../steps/ModelRouteStep";
import { PreparingStep, type PreparingPhase } from "../steps/PreparingStep";
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
  const { isAuthenticated, signInWithGoogle, logoutTransitioning, logoutPhase } = useAuth();
  const readiness = usePermissionReadiness(
    isAuthenticated && currentStep === "permissions",
  );
  const [continuing, setContinuing] = useState(false);
  const [preparePhase, setPreparePhase] = useState<PreparingPhase | null>(null);

  const stepLabels = stepOrder.map((step) => t.onboarding.steps[step]);
  const isFinishing = preparePhase !== null;
  const isLogoutTransition = logoutTransitioning && logoutPhase !== null;

  async function finishOnboarding() {
    if (continuing) return;
    setContinuing(true);
    setPreparePhase("preparing");
    try {
      await sleep(ONBOARDING_PREPARE_DELAY_MS);
      setPreparePhase("complete");
      await sleep(ONBOARDING_COMPLETE_DELAY_MS);
      try {
        await animateMainWindowToControlCenter();
      } catch {
        // Window animation is best-effort; onboarding still completes below.
      }
      markSetupDone();
    } finally {
      setPreparePhase(null);
      setContinuing(false);
    }
  }

  return (
    <OnboardingShell
      step={currentStep}
      stepLabels={stepLabels}
      hideProgress={isFinishing || isLogoutTransition}
    >
      {isLogoutTransition ? <LogoutTransitionStep phase={logoutPhase} /> : null}

      {preparePhase ? <PreparingStep phase={preparePhase} /> : null}

      {!isLogoutTransition && !isFinishing && currentStep === "login" ? (
        <LoginStep
          onGoogleSignIn={signInWithGoogle}
          loggingOut={logoutTransitioning}
        />
      ) : null}

      {!isLogoutTransition && !isFinishing && currentStep === "permissions" ? (
        <PermissionsStep
          readiness={readiness}
          onRefresh={readiness.refresh}
          onContinue={markPermissionsDone}
          onSkip={markPermissionsDone}
          continuing={continuing}
        />
      ) : null}

      {!isLogoutTransition && !isFinishing && currentStep === "modelRoute" ? (
        <ModelRouteStep
          onContinue={markModelRouteDone}
          continuing={continuing}
        />
      ) : null}

      {!isLogoutTransition && !isFinishing && currentStep === "setup" ? (
        <SetupStep
          onComplete={() => void finishOnboarding()}
          continuing={continuing}
        />
      ) : null}
    </OnboardingShell>
  );
}
