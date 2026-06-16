import { useEffect } from "react";
import { CompanionShell } from "../features/companion";
import { hydrateAuth } from "../features/auth";
import { hydrateOnboardingProgress } from "../features/onboarding";
import { useCompanionWindowLifecycle } from "../features/companion/hooks/useCompanionWindowLifecycle";
import { ensureSettingsSync } from "../features/settings";
import { ensureCompanionWebviewTransparency } from "../lib/tauri/mainWindowChrome";
import { useTauriDevTools } from "../lib/tauri/useTauriDevTools";
import { logger } from "../observability/logger";
import { scheduleFrontendFirstPaintRecord } from "../features/lifecycle";
import { useShellTheme } from "../ui";

export function CompanionApp() {
  useShellTheme();
  useTauriDevTools();
  useCompanionWindowLifecycle();

  useEffect(() => {
    logger.info("ui", "companion app mounted", {
      performanceNowMs: Math.round(performance.now()),
    });
    scheduleFrontendFirstPaintRecord("companion");
    void hydrateAuth();
    hydrateOnboardingProgress();
    ensureSettingsSync();
    void ensureCompanionWebviewTransparency();
  }, []);

  return <CompanionShell />;
}
