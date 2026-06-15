import { useEffect, useState } from "react";
import { useI18n } from "../../i18n";
import {
  AdvancedSection,
  Button,
  IosSwitch,
  MacInput,
  SettingSelect,
  PanelHeader,
  SectionHeading,
  SettingRow,
  SettingsGroup,
} from "../../ui";
import { AccentColorPicker } from "./AccentColorPicker";
import { AppearancePicker } from "./AppearancePicker";
import { CompanionPersonaPicker } from "./CompanionPersonaPicker";
import {
  generateTestUtterance,
  loadLlamaSidecarStatus,
  loadLlmProviderHealth,
  type LlamaSidecarStatus,
  type LlmProviderHealth,
} from "./settingsStore";
import { useSettings } from "./useSettings";

const pathInputClass =
  "w-full rounded-[14px] border border-[#48484f] bg-[#2c2c30] px-3 py-2 text-left text-[12px] text-white outline-none transition focus:border-[color:rgb(var(--accent-rgb)/0.45)]";

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
      <SettingsGroup>
        <SettingRow
          title={t.settings.locale.label}
          subtitle={t.settings.locale.subtitle}
        >
          <SettingSelect
            value={locale}
            options={localeOptions(t)}
            onChange={setLocale}
          />
        </SettingRow>
        <AppearancePicker />
      </SettingsGroup>

      <SectionHeading>{t.settings.sections.conversation}</SectionHeading>
      <SettingsGroup>
        <AccentColorPicker />
        <CompanionPersonaPicker />
        <SettingRow
          variant="primary"
          title={t.settings.talkFrequency.label}
          subtitle={t.settings.talkFrequency.subtitle}
        >
          <SettingSelect
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
      </SettingsGroup>

      <AdvancedSection
        title={t.settings.advanced.toggle}
        hint={t.settings.advanced.hint}
      >
        <SectionHeading>{t.settings.sections.model}</SectionHeading>
        <SettingsGroup>
          <SettingRow
            variant="primary"
            title={t.settings.modelRoute.label}
            subtitle={t.settings.modelRoute.subtitle}
          >
            <SettingSelect
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
            <p className="text-right text-[10px] leading-4 text-white/55">
              {t.settings.modelPreset.recommended}
            </p>
          </SettingRow>
          <SettingRow
            layout="stack"
            title={t.settings.localModelPath.label}
            subtitle={t.settings.localModelPath.subtitle}
          >
            <MacInput
              value={localModelPath ?? ""}
              onChange={(value) => setLocalModelPath(value.trim() || null)}
              label={t.settings.localModelPath.inputLabel}
              className={pathInputClass}
            />
          </SettingRow>
          <SettingRow
            layout="stack"
            title={t.settings.llamaBinaryPath.label}
            subtitle={t.settings.llamaBinaryPath.subtitle}
          >
            <MacInput
              value={llamaServerBinaryPath ?? ""}
              onChange={(value) => setLlamaServerBinaryPath(value.trim() || null)}
              label={t.settings.llamaBinaryPath.inputLabel}
              className={pathInputClass}
            />
          </SettingRow>
          <SettingRow
            layout="stack"
            title={t.settings.llamaServer.label}
            subtitle={t.settings.llamaServer.subtitle}
          >
            <div className="grid grid-cols-[1fr_4.5rem] gap-2">
              <MacInput
                value={llamaServerHost}
                onChange={setLlamaServerHost}
                label={t.settings.llamaServer.hostLabel}
                className={pathInputClass}
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
                className={pathInputClass}
              />
            </div>
          </SettingRow>
          <SettingRow
            title={t.settings.sidecarStatus.label}
            subtitle={sidecarStatus.detail}
          >
            <span className="rounded-full border border-[#48484f] bg-[#2c2c30] px-2.5 py-1 text-[11px] font-medium text-white/70">
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
            <div className="max-w-[9.5rem] space-y-0.5 text-right text-[10px] leading-4 text-white/45">
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
            <Button
              variant="soft"
              disabled={testState === "running"}
              onClick={() => void handleTestUtterance()}
            >
              {testState === "running"
                ? t.settings.testUtterance.running
                : t.settings.testUtterance.button}
            </Button>
          </SettingRow>
        </SettingsGroup>
      </AdvancedSection>
    </section>
  );
}
