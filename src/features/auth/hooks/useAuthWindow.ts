import { useEffect } from "react";
import { isTauriRuntime } from "../../../lib/tauriRuntime";
import { applyMainWindowLayoutMode } from "../mainWindowLayout";

export function useAuthWindow(showOnboardingShell: boolean, hydrated: boolean) {
  useEffect(() => {
    if (!hydrated || !isTauriRuntime()) return;

    void applyMainWindowLayoutMode(
      showOnboardingShell ? "onboarding" : "control-center",
    );
  }, [hydrated, showOnboardingShell]);
}
