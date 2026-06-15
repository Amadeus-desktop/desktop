import { useEffect, useRef } from "react";
import { isTauriRuntime } from "../../../lib/tauri/runtime";
import { requestMainWindowLayoutMode } from "../lib/mainWindowLayout";

export function useAuthWindow(
  showOnboardingShell: boolean,
  hydrated: boolean,
  skipInstantLayout = false,
) {
  const previousShowOnboardingShell = useRef<boolean | null>(null);
  const previousSkipInstantLayout = useRef<boolean | null>(null);

  useEffect(() => {
    if (!hydrated || !isTauriRuntime()) {
      previousShowOnboardingShell.current = showOnboardingShell;
      previousSkipInstantLayout.current = skipInstantLayout;
      return;
    }

    const skipWasActive = previousSkipInstantLayout.current === true;
    previousSkipInstantLayout.current = skipInstantLayout;

    if (skipInstantLayout) {
      previousShowOnboardingShell.current = showOnboardingShell;
      return;
    }

    const previous = previousShowOnboardingShell.current;
    previousShowOnboardingShell.current = showOnboardingShell;

    if (skipWasActive && showOnboardingShell) {
      void requestMainWindowLayoutMode("onboarding");
      return;
    }

    if (previous === null) {
      void requestMainWindowLayoutMode(
        showOnboardingShell ? "onboarding" : "control-center",
      );
      return;
    }

    // Onboarding completion already animates the window before setupDone flips.
    if (previous && !showOnboardingShell) {
      return;
    }

    if (previous !== showOnboardingShell) {
      void requestMainWindowLayoutMode(
        showOnboardingShell ? "onboarding" : "control-center",
      );
    }
  }, [hydrated, showOnboardingShell, skipInstantLayout]);
}
