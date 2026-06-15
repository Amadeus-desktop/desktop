import { CompanionShell } from "../features/companion";
import { useCompanionTheme } from "../features/companion/hooks/useCompanionTheme";
import { ensureSettingsSync } from "../features/settings/appSettingsStore";
import { useEffect } from "react";

export function CompanionApp() {
  useCompanionTheme();

  useEffect(() => {
    ensureSettingsSync();
  }, []);

  return <CompanionShell />;
}
