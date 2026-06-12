import { useState } from "react";
import { initialPerceptionState } from "../model/perception";

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

  return {
    analysisEnabled,
    setAnalysisEnabled,
    proactiveTriggerEnabled,
    setProactiveTriggerEnabled,
    privacyFilterEnabled,
    setPrivacyFilterEnabled,
    liveContext: initialPerceptionState.liveContext,
  };
}

