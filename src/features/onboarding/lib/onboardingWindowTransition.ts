import type { MainWindowLayoutMode } from "../../auth/lib/mainWindowLayout";

type OnboardingWindowTransitionDependencies = {
  animateToControlCenter: () => Promise<void>;
  applyLayoutMode: (mode: MainWindowLayoutMode) => Promise<void>;
  logError?: (message: string, context?: Record<string, unknown>) => void;
};

export async function completeOnboardingWindowTransition({
  animateToControlCenter,
  applyLayoutMode,
  logError,
}: OnboardingWindowTransitionDependencies) {
  try {
    await animateToControlCenter();
  } catch (error) {
    logError?.("onboarding window transition failed", { error });
    try {
      await applyLayoutMode("control-center");
    } catch (fallbackError) {
      logError?.("onboarding window layout fallback failed", {
        error: fallbackError,
      });
    }
  }
}
