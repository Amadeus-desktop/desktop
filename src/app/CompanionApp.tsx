import { useEffect } from "react";
import { CompanionShell } from "../features/companion";
import { hydrateAuth } from "../features/auth";
import { useCompanionWindowLifecycle } from "../features/companion/hooks/useCompanionWindowLifecycle";
import { ensureSettingsSync } from "../features/settings/appSettingsStore";
import { useShellTheme } from "../ui/theme/useShellTheme";

export function CompanionApp() {
  useShellTheme();
  useCompanionWindowLifecycle();

  useEffect(() => {
    void hydrateAuth();
    ensureSettingsSync();
  }, []);

  return <CompanionShell />;
}
