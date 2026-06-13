import type { GeneralSettings, ModelRoute, TalkFrequency } from "./types";

export const initialSettings: GeneralSettings = {
  talkFrequency: "balanced",
  modelRoute: "api-first",
  localFallbackEnabled: true,
  nickname: "작업자",
  nightCareEnabled: true,
  localModelPath: null,
  llamaServerBinaryPath: null,
  llamaServerHost: "127.0.0.1",
  llamaServerPort: 8080,
};

export const talkFrequencyOptions: Array<{
  label: string;
  value: TalkFrequency;
}> = [
  { label: "조용하고 묵묵하게", value: "quiet" },
  { label: "적당히 은은하게", value: "balanced" },
  { label: "기운 넘치고 적극적이게", value: "active" },
];

export const modelRouteOptions: Array<{
  label: string;
  value: ModelRoute;
}> = [
  { label: "API 우선", value: "api-first" },
  { label: "로컬 우선", value: "local-first" },
];
