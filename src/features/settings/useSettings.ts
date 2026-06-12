import { useState } from "react";
import { initialSettings } from "./settings";
import type { ModelRoute, TalkFrequency } from "./types";

export function useSettings() {
  const [talkFrequency, setTalkFrequency] = useState(
    initialSettings.talkFrequency,
  );
  const [modelRoute, setModelRoute] = useState(initialSettings.modelRoute);
  const [localFallbackEnabled, setLocalFallbackEnabled] = useState(
    initialSettings.localFallbackEnabled,
  );
  const [nickname, setNickname] = useState(initialSettings.nickname);
  const [nightCareEnabled, setNightCareEnabled] = useState(
    initialSettings.nightCareEnabled,
  );

  return {
    talkFrequency,
    setTalkFrequency: (value: TalkFrequency) => setTalkFrequency(value),
    modelRoute,
    setModelRoute: (value: ModelRoute) => setModelRoute(value),
    localFallbackEnabled,
    setLocalFallbackEnabled,
    nickname,
    setNickname,
    nightCareEnabled,
    setNightCareEnabled,
  };
}
