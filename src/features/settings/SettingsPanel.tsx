import { useEffect, useState } from "react";
import { useI18n } from "../../i18n";
import { IosSwitch, MacInput, MacSelect, SectionHeading, SettingRow } from "../../ui";
import { loadLlamaSidecarStatus, type LlamaSidecarStatus } from "./settingsStore";
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

  useEffect(() => {
    let cancelled = false;

    void loadLlamaSidecarStatus().then((status) => {
      if (!cancelled) {
        setSidecarStatus(status);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    llamaServerBinaryPath,
    llamaServerHost,
    llamaServerPort,
    localModelPath,
    modelRoute,
    settingsRevision,
    t.settings.sidecarStatus.checking,
  ]);

  const sidecarLabel = sidecarStatus.running
    ? t.settings.sidecarStatus.running
    : sidecarStatus.configured
      ? t.settings.sidecarStatus.configured
      : t.settings.sidecarStatus.unconfigured;

  return (
    <section className="tab-panel-enter">
      <header>
        <p className="text-xs font-medium text-[#64b5f6]">{t.settings.eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight text-white">
          {t.settings.title}
        </h1>
        <p className="mt-2 text-[13px] leading-5 text-white/45">
          {t.settings.description}
        </p>
      </header>

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
        <div className="grid min-w-[260px] grid-cols-[1fr_84px] gap-2">
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
    </section>
  );
}
