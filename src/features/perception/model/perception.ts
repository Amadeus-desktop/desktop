import type { PerceptionState } from "./types";

export const initialPerceptionState: PerceptionState = {
  analysisEnabled: true,
  proactiveTriggerEnabled: true,
  privacyFilterEnabled: true,
  liveContext: {
    activeApp: "HWP - 2024_공무_보고서.hwp",
    stateSync: "IDLE (3분간 입력 없음 판단)",
    visionCore: "문서 정체 구간 확인, 발화 큐 대기 중.",
  },
};

