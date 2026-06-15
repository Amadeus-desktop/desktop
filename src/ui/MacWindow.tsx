import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { glassStyles } from "./glassStyles";
import { createWindowDragHandler } from "./windowDrag";
import {
  controlCenterWindowPolicy,
  onboardingWindowPolicy,
} from "./layout/controlCenterPreferences";

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
  const handleDrag = variant === "onboarding" ? createWindowDragHandler() : undefined;

  return (
    <section
      onPointerDown={handleDrag}
      className={cn(
        "animate-window-appear flex h-full w-full min-h-0 overflow-hidden text-white",
        glassStyles.shell,
        glassStyles.radiusWindow,
        variant === "control-center" && "app-shell",
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
