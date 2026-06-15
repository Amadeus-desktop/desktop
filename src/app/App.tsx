import { useEffect } from "react";
import { cn } from "../lib/utils/cn";
import { ControlCenter } from "../features/control-center";
import { useControlCenterWindow } from "../features/control-center/hooks/useControlCenterWindow";
import { hydrateAuth, useAuth, useAuthWindow } from "../features/auth";
import {
  hydrateOnboardingProgress,
  OnboardingFlow,
  useOnboarding,
} from "../features/onboarding";
import { ensureSettingsSync } from "../features/settings";
import { useTauriDevTools } from "../lib/tauri/useTauriDevTools";
import { logger } from "../observability/logger";
import { useShellTheme } from "../ui";

function App() {
  const { hydrated: authHydrated, isAuthenticated, logoutTransitioning } = useAuth();
  const onboarding = useOnboarding(isAuthenticated, logoutTransitioning);
  useShellTheme();
  useTauriDevTools();

  const showOnboardingShell =
    logoutTransitioning || onboarding.showOnboardingShell;
  const { isComplete } = onboarding;

  useAuthWindow(
    showOnboardingShell,
    authHydrated && onboarding.hydrated,
    logoutTransitioning,
  );
  useControlCenterWindow(isAuthenticated && isComplete && !logoutTransitioning);

  useEffect(() => {
    logger.info("ui", "main app mounted", {
      performanceNowMs: Math.round(performance.now()),
    });
    void hydrateAuth();
    hydrateOnboardingProgress();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      ensureSettingsSync();
    }
  }, [isAuthenticated]);

  return (
    <main
      className={cn(
        "relative flex h-dvh w-dvw overflow-hidden bg-transparent text-white",
        showOnboardingShell ? "p-0" : "p-3 max-sm:p-2.5",
      )}
    >
      <div className="tauri-no-drag relative z-10 h-full min-h-0 w-full">
        {showOnboardingShell ? (
          <OnboardingFlow
            currentStep={onboarding.currentStep}
            stepOrder={onboarding.stepOrder}
            markPermissionsDone={onboarding.markPermissionsDone}
            markModelRouteDone={onboarding.markModelRouteDone}
            markSetupDone={onboarding.markSetupDone}
          />
        ) : (
          <ControlCenter />
        )}
      </div>
    </main>
  );
}

export default App;
