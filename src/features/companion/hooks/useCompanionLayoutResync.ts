import { useEffect } from "react";
import type { CompanionMode } from "../types";
import { forceResyncTauriCompanionWindow } from "./useTauriCompanionWindow";

export function useCompanionLayoutResync(mode: CompanionMode) {
  useEffect(() => {
    let outerFrame = 0;
    const innerFrame = requestAnimationFrame(() => {
      outerFrame = requestAnimationFrame(() => {
        forceResyncTauriCompanionWindow();
      });
    });

    return () => {
      cancelAnimationFrame(innerFrame);
      if (outerFrame !== 0) {
        cancelAnimationFrame(outerFrame);
      }
    };
  }, [mode]);
}
