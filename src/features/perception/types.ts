export type LiveContextStatus = {
  activeApp: string;
  stateSync: string;
  visionCore: string;
};

export type PerceptionState = {
  analysisEnabled: boolean;
  proactiveTriggerEnabled: boolean;
  privacyFilterEnabled: boolean;
  liveContext: LiveContextStatus;
};
