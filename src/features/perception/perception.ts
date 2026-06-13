import type { PerceptionState } from "./types";

export const initialPerceptionState: PerceptionState = {
  analysisEnabled: true,
  proactiveTriggerEnabled: true,
  privacyFilterEnabled: true,
  liveContext: {
    activeApp: "HWP",
    windowTitle: "2024_공무_보고서.hwp",
    stateSync: "IDLE (3분간 입력 없음 판단)",
    category: "업무 앱",
  },
};
