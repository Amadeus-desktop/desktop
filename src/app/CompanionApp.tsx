import { useEffect } from "react";
import { CompanionShell } from "../features/companion";
import { hydrateAuth } from "../features/auth";
import { useCompanionWindowLifecycle } from "../features/companion/hooks/useCompanionWindowLifecycle";
import { ensureSettingsSync } from "../features/settings";
import { useShellTheme } from "../ui";

export function CompanionApp() {
  useShellTheme();
  useCompanionWindowLifecycle();

  useEffect(() => {
    void hydrateAuth();
    ensureSettingsSync();
  }, []);

  return <CompanionShell />;
}
