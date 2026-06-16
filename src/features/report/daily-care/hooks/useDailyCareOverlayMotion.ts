import { useCallback, useState } from "react";
import { useMatchMedia } from "../../../../lib/hooks/useMatchMedia";
import { dailyCareMotion } from "../ui/styles";

export const DAILY_CARE_OVERLAY_ENTER_MS = dailyCareMotion.enterMs;
export const DAILY_CARE_OVERLAY_EXIT_MS = dailyCareMotion.exitMs;

type UseDailyCareOverlayMotionOptions = {
  onClosed: () => void;
};

export function useDailyCareOverlayMotion({
  onClosed,
}: UseDailyCareOverlayMotionOptions) {
  const prefersReducedMotion = useMatchMedia("(prefers-reduced-motion: reduce)");
  const [closing, setClosing] = useState(false);

  const requestClose = useCallback(() => {
    if (prefersReducedMotion) {
      onClosed();
      return;
    }

    setClosing(true);
    window.setTimeout(onClosed, DAILY_CARE_OVERLAY_EXIT_MS);
  }, [onClosed, prefersReducedMotion]);

  return {
    closing,
    prefersReducedMotion,
    requestClose,
  };
}
