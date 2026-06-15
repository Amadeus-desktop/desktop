import { CompanionShell } from "../features/companion";
import { useCompanionTheme } from "../features/companion/hooks/useCompanionTheme";
import { useCompanionWindowLifecycle } from "../features/companion/hooks/useCompanionWindowLifecycle";
import { ensureSettingsSync } from "../features/settings/appSettingsStore";
import { useEffect } from "react";

export function CompanionApp() {
  useCompanionTheme();
  useCompanionWindowLifecycle();

  useEffect(() => {
    ensureSettingsSync();
  }, []);

  return <CompanionShell />;
}
