import { useCallback, useState } from "react";
import { useLifecycleFetch } from "../../../lib/hooks/useLifecycleFetch";
import { getScreenCapturePermissionStatus } from "../../context";
import type { PermissionReadiness } from "../types";

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
        const screen = await getScreenCapturePermissionStatus();
        if (!isActive()) return;

        const screenGranted = screen.granted;

        setState({
          screenGranted,
          ocrAvailable: screenGranted,
          ready: screenGranted,
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
    refreshOnVisible: true,
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
