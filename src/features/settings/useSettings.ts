import { useEffect, useMemo, useState } from "react";
import { setLlmProviderRoute } from "../llm/llmRepository";
import { initialSettings } from "./settings";
import { loadGeneralSettings, saveGeneralSettings } from "./settingsStore";
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
  const [hydrated, setHydrated] = useState(false);
  const settings = useMemo(
    () => ({
      talkFrequency,
      modelRoute,
      localFallbackEnabled,
      nickname,
      nightCareEnabled,
    }),
    [
      talkFrequency,
      modelRoute,
      localFallbackEnabled,
      nickname,
      nightCareEnabled,
    ],
  );

  useEffect(() => {
    let cancelled = false;

    void loadGeneralSettings()
      .then((storedSettings) => {
        if (cancelled) return;

        setTalkFrequency(storedSettings.talkFrequency);
        setModelRoute(storedSettings.modelRoute);
        setLocalFallbackEnabled(storedSettings.localFallbackEnabled);
        setNickname(storedSettings.nickname);
        setNightCareEnabled(storedSettings.nightCareEnabled);
        setHydrated(true);
      })
      .catch(() => {
        if (!cancelled) {
          setHydrated(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    void saveGeneralSettings(settings);
    void setLlmProviderRoute(modelRoute, localFallbackEnabled);
  }, [hydrated, localFallbackEnabled, modelRoute, settings]);

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
