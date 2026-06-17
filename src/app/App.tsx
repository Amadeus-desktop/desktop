import { useEffect, useRef, useState } from "react";
import { cn } from "../lib/utils/cn";
import { ControlCenter } from "../features/control-center";
import { useControlCenterWindow } from "../features/control-center/hooks/useControlCenterWindow";
import { hydrateAuth, useAuth, useAuthWindow } from "../features/auth";
import {
  pullCloudConversationMessages,
  syncPendingConversationMessages,
} from "../features/conversation";
import {
  hydrateOnboardingProgress,
  OnboardingFlow,
  useOnboarding,
} from "../features/onboarding";
import { syncConversationMemorySummaries } from "../features/memory";
import { ensureSettingsSync, useAppSettings } from "../features/settings";
import { useTauriDevTools } from "../lib/tauri/useTauriDevTools";
import { logger } from "../observability/logger";
import { scheduleFrontendFirstPaintRecord } from "../features/lifecycle";
import { isTauriRuntime } from "../lib/tauri/runtime";
import { useShellTheme } from "../ui";

function App() {
  const { hydrated: authHydrated, isAuthenticated, logoutTransitioning, logoutPhase } = useAuth();
  const appSettings = useAppSettings();
  const onboarding = useOnboarding(isAuthenticated, logoutTransitioning);
  useShellTheme();
  useTauriDevTools();

  const showOnboardingShell = logoutTransitioning
    ? logoutPhase !== null
    : onboarding.showOnboardingShell;
  const { isComplete } = onboarding;
  const [shellContentVisible, setShellContentVisible] = useState(true);
  const previousShowOnboardingShell = useRef(showOnboardingShell);

  useEffect(() => {
    if (previousShowOnboardingShell.current === showOnboardingShell) return;

    previousShowOnboardingShell.current = showOnboardingShell;
    setShellContentVisible(false);
    const frame = window.requestAnimationFrame(() => {
      setShellContentVisible(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [showOnboardingShell]);

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
    scheduleFrontendFirstPaintRecord("main");
    void hydrateAuth();
    hydrateOnboardingProgress();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      ensureSettingsSync();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !appSettings.hydrated) return;

    const personaId = appSettings.settings.companionPersonaId;
    void syncPendingConversationMessages()
      .then(() => pullCloudConversationMessages({ personaId }))
      .then(() => syncConversationMemorySummaries({ personaId }))
      .catch((error) => {
        logger.warn("auth", "conversation sync failed", {
          error: error instanceof Error ? error.message : "unknown",
        });
      });
  }, [
    appSettings.hydrated,
    appSettings.settings.companionPersonaId,
    isAuthenticated,
  ]);

  return (
    <main
      className={cn(
        "relative flex h-dvh w-dvw overflow-hidden bg-transparent p-0 text-[color:var(--shell-ink)]",
      )}
    >
      <div
        className={cn(
          "tauri-no-drag relative z-10 h-full min-h-0 w-full",
          isTauriRuntime() && "transition-opacity duration-200 ease-out",
          isTauriRuntime() && !shellContentVisible && "opacity-0",
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
