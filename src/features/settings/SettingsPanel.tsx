import { useEffect, useState } from "react";
import { useI18n } from "../../i18n";
import { IosSwitch, MacInput, MacSelect, PanelHeader, SectionHeading, SettingRow } from "../../ui";
import { CompanionPersonaPicker } from "./CompanionPersonaPicker";
import {
  generateTestUtterance,
  loadLlamaSidecarStatus,
  loadLlmProviderHealth,
  type LlamaSidecarStatus,
  type LlmProviderHealth,
} from "./settingsStore";
import { useSettings } from "./useSettings";

export function SettingsPanel() {
  const t = useI18n();
  const {
    locale,
    setLocale,
    talkFrequency,
    setTalkFrequency,
    modelRoute,
    setModelRoute,
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
    settingsRevision,
    talkFrequencyOptions,
    modelRouteOptions,
    localeOptions,
  } = useSettings();
  const [sidecarStatus, setSidecarStatus] = useState<LlamaSidecarStatus>({
    configured: false,
    running: false,
    detail: t.settings.sidecarStatus.checking,
  });
  const [providerHealth, setProviderHealth] = useState<LlmProviderHealth[]>([]);
  const [healthState, setHealthState] = useState<"loading" | "ready">("loading");
  const [testState, setTestState] = useState<"idle" | "running">("idle");
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRuntimeStatus() {
      setHealthState("loading");
      const [sidecar, health] = await Promise.all([
        loadLlamaSidecarStatus(),
        loadLlmProviderHealth(),
      ]);

      if (!cancelled) {
        setSidecarStatus(sidecar);
        setProviderHealth(health);
        setHealthState("ready");
      }
    }

    void loadRuntimeStatus();

    return () => {
      cancelled = true;
    };
  }, [
    llamaServerBinaryPath,
    llamaServerHost,
    llamaServerPort,
    localModelPath,
    localFallbackEnabled,
    modelRoute,
    settingsRevision,
    t.settings.sidecarStatus.checking,
  ]);

  const sidecarLabel = sidecarStatus.running
    ? t.settings.sidecarStatus.running
    : sidecarStatus.configured
      ? t.settings.sidecarStatus.configured
      : t.settings.sidecarStatus.unconfigured;

  async function handleTestUtterance() {
    setTestState("running");
    setTestResult(null);

    try {
      const generation = await generateTestUtterance();
      setTestResult(`${generation.message} · ${generation.provider}`);
    } catch (error) {
      setTestResult(error instanceof Error ? error.message : String(error));
    } finally {
      setTestState("idle");
    }
  }

  return (
    <section className="tab-panel-enter">
      <PanelHeader
        eyebrow={t.settings.eyebrow}
        title={t.settings.title}
        description={t.settings.description}
      />

      <SectionHeading>{t.settings.sections.language}</SectionHeading>
      <SettingRow
        title={t.settings.locale.label}
        subtitle={t.settings.locale.subtitle}
      >
        <MacSelect
          value={locale}
          options={localeOptions(t)}
          onChange={setLocale}
        />
      </SettingRow>

      <SectionHeading>{t.settings.sections.conversation}</SectionHeading>
      <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <CompanionPersonaPicker />
      </div>
      <SettingRow
        title={t.settings.talkFrequency.label}
        subtitle={t.settings.talkFrequency.subtitle}
      >
        <MacSelect
          value={talkFrequency}
          options={talkFrequencyOptions(t)}
          onChange={setTalkFrequency}
        />
      </SettingRow>
      <SettingRow
        title={t.settings.nickname.label}
        subtitle={t.settings.nickname.subtitle}
      >
        <MacInput
          value={nickname}
          onChange={setNickname}
          label={t.settings.nickname.inputLabel}
        />
      </SettingRow>
      <SettingRow
        title={t.settings.nightCare.label}
        subtitle={t.settings.nightCare.subtitle}
      >
        <IosSwitch
          checked={nightCareEnabled}
          onChange={setNightCareEnabled}
          label={t.settings.nightCare.switchLabel}
        />
      </SettingRow>

      <SectionHeading>{t.settings.sections.model}</SectionHeading>
      <SettingRow
        title={t.settings.modelRoute.label}
        subtitle={t.settings.modelRoute.subtitle}
      >
        <MacSelect
          value={modelRoute}
          options={modelRouteOptions(t)}
          onChange={setModelRoute}
        />
      </SettingRow>
      <SettingRow
        title={t.settings.localFallback.label}
        subtitle={t.settings.localFallback.subtitle}
      >
        <IosSwitch
          checked={localFallbackEnabled}
          onChange={setLocalFallbackEnabled}
          label={t.settings.localFallback.switchLabel}
        />
      </SettingRow>
      <SettingRow
        title={t.settings.modelPreset.label}
        subtitle={t.settings.modelPreset.subtitle}
      >
        <p className="max-w-[220px] text-right text-[11px] leading-4 text-white/55">
          {t.settings.modelPreset.recommended}
        </p>
      </SettingRow>
      <SettingRow
        title={t.settings.localModelPath.label}
        subtitle={t.settings.localModelPath.subtitle}
      >
        <MacInput
          value={localModelPath ?? ""}
          onChange={(value) => setLocalModelPath(value.trim() || null)}
          label={t.settings.localModelPath.inputLabel}
        />
      </SettingRow>
      <SettingRow
        title={t.settings.llamaBinaryPath.label}
        subtitle={t.settings.llamaBinaryPath.subtitle}
      >
        <MacInput
          value={llamaServerBinaryPath ?? ""}
          onChange={(value) => setLlamaServerBinaryPath(value.trim() || null)}
          label={t.settings.llamaBinaryPath.inputLabel}
        />
      </SettingRow>
      <SettingRow
        title={t.settings.llamaServer.label}
        subtitle={t.settings.llamaServer.subtitle}
      >
        <div className="grid min-w-[200px] max-w-[240px] grid-cols-[1fr_72px] gap-2">
          <MacInput
            value={llamaServerHost}
            onChange={setLlamaServerHost}
            label={t.settings.llamaServer.hostLabel}
          />
          <MacInput
            value={String(llamaServerPort)}
            onChange={(value) => {
              const port = Number(value);
              if (Number.isInteger(port) && port > 0 && port <= 65535) {
                setLlamaServerPort(port);
              }
            }}
            label={t.settings.llamaServer.portLabel}
          />
        </div>
      </SettingRow>
      <SettingRow
        title={t.settings.sidecarStatus.label}
        subtitle={sidecarStatus.detail}
      >
        <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-medium text-white/70">
          {sidecarLabel}
        </span>
      </SettingRow>
      <SettingRow
        title={t.settings.llmHealth.label}
        subtitle={
          healthState === "loading"
            ? t.settings.llmHealth.checking
            : providerHealth
                .map(
                  (health) =>
                    `${health.provider}: ${
                      health.available
                        ? t.settings.llmHealth.available
                        : t.settings.llmHealth.unavailable
                    }`,
                )
                .join(" · ")
        }
      >
        <div className="max-w-[220px] space-y-1 text-right text-[10px] leading-4 text-white/45">
          {healthState === "loading"
            ? t.settings.llmHealth.checking
            : providerHealth.map((health) => (
                <p key={health.provider}>{health.detail}</p>
              ))}
        </div>
      </SettingRow>
      <SettingRow
        title={t.settings.testUtterance.label}
        subtitle={testResult ?? t.settings.testUtterance.subtitle}
      >
        <button
          type="button"
          className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-medium text-white/80 transition hover:bg-white/12 disabled:opacity-50"
          disabled={testState === "running"}
          onClick={() => void handleTestUtterance()}
        >
          {testState === "running"
            ? t.settings.testUtterance.running
            : t.settings.testUtterance.button}
        </button>
      </SettingRow>
    </section>
  );
}
