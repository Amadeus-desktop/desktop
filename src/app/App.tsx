import { useEffect } from "react";
import { cn } from "../lib/cn";
import { ControlCenter } from "../features/control-center";
import { useControlCenterWindow } from "../features/control-center/hooks/useControlCenterWindow";
import { hydrateAuth, useAuth, useAuthWindow } from "../features/auth";
import {
  hydrateOnboardingProgress,
  OnboardingFlow,
  useOnboarding,
} from "../features/onboarding";
import { ensureSettingsSync } from "../features/settings/appSettingsStore";
import { useShellTheme } from "../ui/theme/useShellTheme";
import { createWindowDragHandler } from "../ui/windowDrag";

function App() {
  const { hydrated: authHydrated, isAuthenticated } = useAuth();
  const onboarding = useOnboarding(isAuthenticated);
  const handleOnboardingDrag = createWindowDragHandler();
  useShellTheme();

  const { showOnboardingShell, isComplete } = onboarding;

  useAuthWindow(showOnboardingShell, authHydrated && onboarding.hydrated);
  useControlCenterWindow(isAuthenticated && isComplete);

  useEffect(() => {
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
      onPointerDown={showOnboardingShell ? handleOnboardingDrag : undefined}
      className={cn(
        "relative flex h-dvh w-dvw overflow-hidden bg-transparent text-white",
        showOnboardingShell ? "p-0" : "p-3 max-sm:p-2.5",
      )}
    >
      <div
        className={cn(
          "relative z-10 h-full min-h-0 w-full",
          !showOnboardingShell && "app-no-drag",
        )}
      >
        {isComplete ? (
          <ControlCenter />
        ) : (
          <OnboardingFlow
            currentStep={onboarding.currentStep}
            stepOrder={onboarding.stepOrder}
            markPermissionsDone={onboarding.markPermissionsDone}
            markSetupDone={onboarding.markSetupDone}
          />
        )}
      </div>
    </main>
  );
}

export default App;
