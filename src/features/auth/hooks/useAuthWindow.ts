import { useEffect } from "react";
import { isTauriRuntime } from "../../../lib/tauri/runtime";
import { applyMainWindowLayoutMode } from "../lib/mainWindowLayout";

export function useAuthWindow(
  showOnboardingShell: boolean,
  hydrated: boolean,
  skipInstantLayout = false,
) {
  useEffect(() => {
    if (!hydrated || !isTauriRuntime() || skipInstantLayout) return;

    void applyMainWindowLayoutMode(
      showOnboardingShell ? "onboarding" : "control-center",
    );
  }, [hydrated, showOnboardingShell, skipInstantLayout]);
}
