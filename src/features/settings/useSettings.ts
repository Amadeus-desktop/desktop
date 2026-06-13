import { useEffect, useMemo, useRef, useState } from "react";
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
  const [localModelPath, setLocalModelPath] = useState(
    initialSettings.localModelPath,
  );
  const [llamaServerBinaryPath, setLlamaServerBinaryPath] = useState(
    initialSettings.llamaServerBinaryPath,
  );
  const [llamaServerHost, setLlamaServerHost] = useState(
    initialSettings.llamaServerHost,
  );
  const [llamaServerPort, setLlamaServerPort] = useState(
    initialSettings.llamaServerPort,
  );
  const [hydrated, setHydrated] = useState(false);
  const saveSequence = useRef(0);
  const settings = useMemo(
    () => ({
      talkFrequency,
      modelRoute,
      localFallbackEnabled,
      nickname,
      nightCareEnabled,
      localModelPath,
      llamaServerBinaryPath,
      llamaServerHost,
      llamaServerPort,
    }),
    [
      talkFrequency,
      modelRoute,
      localFallbackEnabled,
      nickname,
      nightCareEnabled,
      localModelPath,
      llamaServerBinaryPath,
      llamaServerHost,
      llamaServerPort,
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
        setLocalModelPath(storedSettings.localModelPath);
        setLlamaServerBinaryPath(storedSettings.llamaServerBinaryPath);
        setLlamaServerHost(storedSettings.llamaServerHost);
        setLlamaServerPort(storedSettings.llamaServerPort);
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

    const sequence = ++saveSequence.current;
    const timeout = window.setTimeout(() => {
      void saveGeneralSettings(settings).then((savedSettings) => {
        if (sequence !== saveSequence.current) return;

        setTalkFrequency(savedSettings.talkFrequency);
        setModelRoute(savedSettings.modelRoute);
        setLocalFallbackEnabled(savedSettings.localFallbackEnabled);
        setNickname(savedSettings.nickname);
        setNightCareEnabled(savedSettings.nightCareEnabled);
        setLocalModelPath(savedSettings.localModelPath);
        setLlamaServerBinaryPath(savedSettings.llamaServerBinaryPath);
        setLlamaServerHost(savedSettings.llamaServerHost);
        setLlamaServerPort(savedSettings.llamaServerPort);
      });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [hydrated, settings]);

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
    localModelPath,
    setLocalModelPath,
    llamaServerBinaryPath,
    setLlamaServerBinaryPath,
    llamaServerHost,
    setLlamaServerHost,
    llamaServerPort,
    setLlamaServerPort,
  };
}
