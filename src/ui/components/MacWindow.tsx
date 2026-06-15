import type { ReactNode } from "react";
import { cn } from "../../lib/utils/cn";
import { isTauriRuntime } from "../../lib/tauri/runtime";
import { glassStyles } from "../theme/shellStyles";
import {
  controlCenterWindowPolicy,
  onboardingWindowPolicy,
} from "../layout/controlCenterPreferences";

type MacWindowVariant = "control-center" | "onboarding";

type MacWindowProps = {
  children: ReactNode;
  variant?: MacWindowVariant;
};

const minSizeByVariant = {
  "control-center": {
    minWidth: controlCenterWindowPolicy.minWidth,
    minHeight: controlCenterWindowPolicy.minHeight,
  },
  onboarding: {
    minWidth: onboardingWindowPolicy.minWidth,
    minHeight: onboardingWindowPolicy.minHeight,
  },
} as const;

export function MacWindow({ children, variant = "control-center" }: MacWindowProps) {
  const minSize = minSizeByVariant[variant];
  const skipMotion = isTauriRuntime();

  return (
    <section
      className={cn(
        "flex h-full w-full min-h-0 overflow-hidden text-white",
        glassStyles.shell,
        glassStyles.radiusWindow,
        "tauri-no-drag",
        !skipMotion && variant === "control-center" && "motion-safe-animate animate-window-appear",
        !skipMotion && variant === "onboarding" && "motion-safe-animate animate-window-fade-in",
      )}
      style={{
        minWidth: minSize.minWidth,
        minHeight: minSize.minHeight,
      }}
    >
      {children}
    </section>
  );
}
