export type LiveContextStatus = {
  activeApp: string;
  windowTitle: string;
  stateSync: string;
  category: string;
};

export type CaptureMetadata = {
  approved: boolean;
  capturedAtMs: number;
  ttlMs: number;
  sensitiveMarker: boolean;
};

export type OcrObservation = {
  textSummaryRedacted: string;
  visibleTextClasses: string[];
  contentKind: string;
  confidence: number;
  sensitiveHits: number;
  sourceTtlMs: number;
};

export type OcrProviderStatus = {
  provider: string;
  available: boolean;
  detail: string;
};
