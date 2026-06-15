import type { ReactNode } from "react";
import { glassStyles } from "./glassStyles";
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

  return (
    <section
      className={`app-shell animate-window-appear flex h-full w-full min-h-0 overflow-hidden text-white ${glassStyles.shell} ${glassStyles.radiusWindow}`}
      style={{
        minWidth: minSize.minWidth,
        minHeight: minSize.minHeight,
      }}
    >
      {children}
    </section>
  );
}
