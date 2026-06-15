import { useEffect } from "react";
import { CompanionShell } from "../features/companion";
import { hydrateAuth } from "../features/auth";
import { hydrateOnboardingProgress } from "../features/onboarding";
import { useCompanionWindowLifecycle } from "../features/companion/hooks/useCompanionWindowLifecycle";
import { ensureSettingsSync } from "../features/settings";
import { useShellTheme } from "../ui";

export function CompanionApp() {
  useShellTheme();
  useCompanionWindowLifecycle();

  useEffect(() => {
    void hydrateAuth();
    hydrateOnboardingProgress();
    ensureSettingsSync();
  }, []);

  return <CompanionShell />;
}
