import type { LocaleCode } from "../../i18n/types";

export type TalkFrequency = "quiet" | "balanced" | "active";
export type ModelRoute = "api-first" | "local-first" | "template";

export type GeneralSettings = {
  locale: LocaleCode;
  talkFrequency: TalkFrequency;
  modelRoute: ModelRoute;
  localFallbackEnabled: boolean;
  nickname: string;
  nightCareEnabled: boolean;
  localModelPath: string | null;
  llamaServerBinaryPath: string | null;
  llamaServerHost: string;
  llamaServerPort: number;
};
