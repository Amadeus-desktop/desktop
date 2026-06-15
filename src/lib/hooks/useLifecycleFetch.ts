import { useEffect, useRef } from "react";

type UseLifecycleFetchOptions = {
  enabled?: boolean;
  intervalMs?: number;
  refreshOnVisible?: boolean;
  deps?: readonly unknown[];
  fetch: (isActive: () => boolean) => Promise<void>;
};

export function useLifecycleFetch({
  enabled = true,
  intervalMs,
  refreshOnVisible = true,
  deps = [],
  fetch,
}: UseLifecycleFetchOptions) {
  const fetchRef = useRef(fetch);
  fetchRef.current = fetch;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const isActive = () => !cancelled;

    function run() {
      void fetchRef.current(isActive);
    }

    run();

    let intervalId: number | undefined;
    if (intervalMs !== undefined) {
      intervalId = window.setInterval(() => {
        if (document.hidden) return;
        run();
      }, intervalMs);
    }

    function handleVisibilityChange() {
      if (refreshOnVisible && !document.hidden) {
        run();
      }
    }

    if (refreshOnVisible) {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      cancelled = true;
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
      if (refreshOnVisible) {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [enabled, intervalMs, refreshOnVisible, ...deps]);
}
