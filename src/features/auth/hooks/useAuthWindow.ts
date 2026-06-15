import { useEffect } from "react";
import { isTauriRuntime } from "../../../lib/tauriRuntime";
import { applyMainWindowLayoutMode } from "../mainWindowLayout";

export function useAuthWindow(isAuthenticated: boolean, hydrated: boolean) {
  useEffect(() => {
    if (!hydrated || !isTauriRuntime()) return;

    void applyMainWindowLayoutMode(
      isAuthenticated ? "control-center" : "onboarding",
    );
  }, [hydrated, isAuthenticated]);
}
