export type LiveContextStatus = {
  activeApp: string;
  windowTitle: string;
  stateSync: string;
  category: string;
};

export type PerceptionState = {
  analysisEnabled: boolean;
  proactiveTriggerEnabled: boolean;
  privacyFilterEnabled: boolean;
  liveContext: LiveContextStatus;
};
