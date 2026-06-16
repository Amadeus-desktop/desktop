import { useEffect, useRef } from "react";
import { isTauriRuntime } from "../../../lib/tauri/runtime";
import { requestMainWindowLayout } from "../../lifecycle";

export function useAuthWindow(
  showOnboardingShell: boolean,
  hydrated: boolean,
  skipInstantLayout = false,
) {
  const previousShowOnboardingShell = useRef<boolean | null>(null);
  const previousSkipInstantLayout = useRef<boolean | null>(null);

  useEffect(() => {
    if (!hydrated || !isTauriRuntime()) {
      // Do NOT seed previousShowOnboardingShell here. Seeding it before the
      // first hydrated run would poison the `previous === null` initial-layout
      // branch below, leaving the window at its tauri.conf default size.
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
      void requestMainWindowLayout({
        mode: "onboarding",
        reason: "logout",
        priority: 20,
      });
      return;
    }

    if (previous === null) {
      void requestMainWindowLayout({
        mode: showOnboardingShell ? "onboarding" : "control-center",
        reason: "initial-hydration",
        priority: 10,
      });
      return;
    }

    // Onboarding completion already animates the window before setupDone flips.
    if (previous && !showOnboardingShell) {
      return;
    }

    if (previous !== showOnboardingShell) {
      void requestMainWindowLayout({
        mode: showOnboardingShell ? "onboarding" : "control-center",
        reason: "initial-hydration",
        priority: 10,
      });
    }
  }, [hydrated, showOnboardingShell, skipInstantLayout]);
}
