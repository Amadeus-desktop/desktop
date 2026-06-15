import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CONTEXT_POLL_INTERVAL_MS,
  hasSignificantContextChange,
} from "../../domain/context";
import { getPrivacyKeywords } from "../../domain/settings";
import { useI18n } from "../../i18n";
import { useAppSettings } from "../settings/appSettingsStore";
import type { LiveContextStatus } from "../perception/types";
import {
  assessCurrentPrivacyContext,
  capturePrivacyCheckedContextEvent,
} from "./contextRepository";
import { formatLiveContextStatus } from "./formatLiveContext";
import type { MacosContextSnapshot, PrivacyAssessment, ScreenCapturePermissionStatus } from "./types";

export type ContextSnapshotState = {
  liveContext: LiveContextStatus;
  privacyAssessment: PrivacyAssessment | null;
  screenCapturePermission: ScreenCapturePermissionStatus | null;
  status: "paused" | "loading" | "ready" | "error";
};

const emptyLiveContext: LiveContextStatus = {
  activeApp: "—",
  windowTitle: "—",
  stateSync: "—",
  category: "—",
};

export function useContextSnapshot(): ContextSnapshotState {
  const { settings } = useAppSettings();
  const t = useI18n();
  const previousSnapshotRef = useRef<MacosContextSnapshot | null>(null);
  const [state, setState] = useState<ContextSnapshotState>({
    liveContext: emptyLiveContext,
    privacyAssessment: null,
    screenCapturePermission: null,
    status: settings.analysisEnabled ? "loading" : "paused",
  });

  const keywords = useMemo(
    () =>
      getPrivacyKeywords(
        settings.privacyFilterEnabled,
        settings.customPrivacyKeywords,
      ),
    [settings.customPrivacyKeywords, settings.privacyFilterEnabled],
  );

  const refresh = useCallback(async (isCurrent: () => boolean = () => true) => {
    if (!settings.analysisEnabled) {
      return;
    }

    setState((current) =>
      current.status === "ready" ? current : { ...current, status: "loading" },
    );

    try {
      const context = await assessCurrentPrivacyContext(keywords);
      if (!isCurrent() || !settings.analysisEnabled) return;

      const shouldPersist = hasSignificantContextChange(
        previousSnapshotRef.current,
        context.snapshot,
      );

      if (shouldPersist) {
        previousSnapshotRef.current = context.snapshot;
        await capturePrivacyCheckedContextEvent(keywords);
        if (!isCurrent() || !settings.analysisEnabled) return;
      }

      setState({
        liveContext: formatLiveContextStatus(
          context.snapshot,
          context.assessment.redactedWindowTitle,
          t.perception.contextLabels,
        ),
        privacyAssessment: context.assessment,
        screenCapturePermission: context.screenCapturePermission,
        status: "ready",
      });
    } catch {
      if (!isCurrent() || !settings.analysisEnabled) return;
      setState((current) => ({
        ...current,
        status: "error",
      }));
    }
  }, [keywords, settings.analysisEnabled, t]);

  useEffect(() => {
    if (!settings.analysisEnabled) {
      previousSnapshotRef.current = null;
      setState({
        liveContext: emptyLiveContext,
        privacyAssessment: null,
        screenCapturePermission: null,
        status: "paused",
      });
      return;
    }

    let cancelled = false;
    const isCurrent = () => !cancelled;

    void refresh(isCurrent);

    const intervalId = window.setInterval(() => {
      if (document.hidden) return;
      void refresh(isCurrent);
    }, CONTEXT_POLL_INTERVAL_MS);

    function handleVisibilityChange() {
      if (!document.hidden) {
        void refresh(isCurrent);
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refresh, settings.analysisEnabled]);

  return state;
}
