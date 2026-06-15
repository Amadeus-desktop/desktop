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
import { ensureMainWebviewTransparency } from "../lib/tauri/mainWindowChrome";
import { isTauriRuntime } from "../lib/tauri/runtime";
import { useShellTheme } from "../ui";

function App() {
  const { hydrated: authHydrated, isAuthenticated, logoutTransitioning } = useAuth();
  const onboarding = useOnboarding(isAuthenticated, logoutTransitioning);
  useShellTheme();

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
    void hydrateAuth();
    hydrateOnboardingProgress();
  }, []);

  useEffect(() => {
    if (!isTauriRuntime()) return;
    void ensureMainWebviewTransparency();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      ensureSettingsSync();
    }
  }, [isAuthenticated]);

  return (
    <main
      className={cn(
        "pointer-events-none relative flex h-dvh w-dvw overflow-hidden bg-transparent text-white",
        showOnboardingShell ? "p-0" : "p-3 max-sm:p-2.5",
      )}
    >
      <div
        className={cn(
          "pointer-events-auto relative z-10 h-full min-h-0 w-full",
          !showOnboardingShell && "tauri-no-drag",
        )}
      >
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
