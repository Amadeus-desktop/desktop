import { useEffect, useState } from "react";
import { capturePrivacyCheckedContextEvent } from "../context/contextRepository";
import type {
  AppCategory,
  MacosContextSnapshot,
  PrivacyAssessment,
  ScreenCapturePermissionStatus,
} from "../context/types";
import { initialPerceptionState } from "./perception";
import type { LiveContextStatus } from "./types";

export function usePerceptionStatus() {
  const [analysisEnabled, setAnalysisEnabled] = useState(
    initialPerceptionState.analysisEnabled,
  );
  const [proactiveTriggerEnabled, setProactiveTriggerEnabled] = useState(
    initialPerceptionState.proactiveTriggerEnabled,
  );
  const [privacyFilterEnabled, setPrivacyFilterEnabled] = useState(
    initialPerceptionState.privacyFilterEnabled,
  );
  const [liveContext, setLiveContext] = useState(
    initialPerceptionState.liveContext,
  );
  const [privacyAssessment, setPrivacyAssessment] =
    useState<PrivacyAssessment | null>(null);
  const [screenCapturePermission, setScreenCapturePermission] =
    useState<ScreenCapturePermissionStatus | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSnapshot() {
      const checkedContext = await capturePrivacyCheckedContextEvent([]);
      if (!cancelled) {
        setLiveContext(
          toLiveContextStatus(
            checkedContext.snapshot,
            checkedContext.assessment.redactedWindowTitle,
          ),
        );
        setPrivacyAssessment(checkedContext.assessment);
        setScreenCapturePermission(checkedContext.screenCapturePermission);
      }
    }

    void loadSnapshot().catch(() => {
      if (!cancelled) {
        setLiveContext(initialPerceptionState.liveContext);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    analysisEnabled,
    setAnalysisEnabled,
    proactiveTriggerEnabled,
    setProactiveTriggerEnabled,
    privacyFilterEnabled,
    setPrivacyFilterEnabled,
    liveContext,
    privacyAssessment,
    screenCapturePermission,
  };
}

function toLiveContextStatus(
  snapshot: MacosContextSnapshot,
  windowTitle: string,
): LiveContextStatus {
  return {
    activeApp: formatAppLabel(snapshot),
    windowTitle,
    stateSync: formatIdleState(snapshot.idleSeconds),
    category: formatCategory(snapshot.category),
  };
}

function formatAppLabel(snapshot: MacosContextSnapshot) {
  if (!snapshot.bundleIdentifier) {
    return snapshot.appName;
  }

  return `${snapshot.appName} (${snapshot.bundleIdentifier})`;
}

function formatIdleState(idleSeconds: number) {
  if (idleSeconds < 60) {
    return `ACTIVE (${Math.round(idleSeconds)}초 idle)`;
  }

  return `IDLE (${Math.round(idleSeconds / 60)}분 idle)`;
}

function formatCategory(category: AppCategory) {
  const labelByCategory: Record<AppCategory, string> = {
    work: "업무 앱",
    non_work: "비업무 앱",
    unknown: "미분류",
  };

  return labelByCategory[category];
}
