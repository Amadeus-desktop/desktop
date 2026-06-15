import { CompanionShell } from "../features/companion";
import { useCompanionWindowLifecycle } from "../features/companion/hooks/useCompanionWindowLifecycle";
import { ensureSettingsSync } from "../features/settings/appSettingsStore";
import { useShellTheme } from "../ui/theme/useShellTheme";
import { useEffect } from "react";

export function CompanionApp() {
  useShellTheme();
  useCompanionWindowLifecycle();

  useEffect(() => {
    ensureSettingsSync();
  }, []);

  return <CompanionShell />;
}
