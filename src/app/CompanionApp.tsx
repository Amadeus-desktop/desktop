import { CompanionShell } from "../features/companion";
import { useCompanionTheme } from "../features/companion/hooks/useCompanionTheme";

export function CompanionApp() {
  useCompanionTheme();

  return <CompanionShell />;
}
