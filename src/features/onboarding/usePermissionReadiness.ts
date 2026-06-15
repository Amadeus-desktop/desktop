import { useCallback, useState } from "react";
import { useLifecycleFetch } from "../../lib/useLifecycleFetch";
import { getScreenCapturePermissionStatus } from "../context/contextRepository";
import { getOcrProviderStatus } from "../perception/ocrRepository";
import type { PermissionReadiness } from "./types";

const initialState: PermissionReadiness = {
  screenGranted: false,
  ocrAvailable: false,
  ready: false,
  loading: true,
};

export function usePermissionReadiness(enabled: boolean) {
  const [state, setState] = useState<PermissionReadiness>(initialState);

  const loadReadiness = useCallback(
    async (isActive: () => boolean) => {
      if (!enabled) {
        if (!isActive()) return;
        setState({ ...initialState, loading: false });
        return;
      }

      setState((current) => ({ ...current, loading: true }));

      try {
        const [screen, ocr] = await Promise.all([
          getScreenCapturePermissionStatus(),
          getOcrProviderStatus(),
        ]);
        if (!isActive()) return;

        const screenGranted = screen.granted;
        const ocrAvailable = ocr.available;

        setState({
          screenGranted,
          ocrAvailable,
          ready: screenGranted && ocrAvailable,
          loading: false,
        });
      } catch {
        if (!isActive()) return;
        setState({
          screenGranted: false,
          ocrAvailable: false,
          ready: false,
          loading: false,
        });
      }
    },
    [enabled],
  );

  useLifecycleFetch({
    enabled,
    refreshOnVisible: false,
    deps: [loadReadiness],
    fetch: loadReadiness,
  });

  const refresh = useCallback(() => {
    return loadReadiness(() => true);
  }, [loadReadiness]);

  return {
    ...state,
    refresh,
  };
}
