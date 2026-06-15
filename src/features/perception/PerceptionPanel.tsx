import { IosSwitch, SectionHeading, SettingRow, StatusPill } from "../../ui";
import { useI18n } from "../../i18n";
import { LiveContextLog } from "./LiveContextLog";
import { PrivacyFilterCard } from "./PrivacyFilterCard";
import { usePerceptionStatus } from "./usePerceptionStatus";

export function PerceptionPanel() {
  const t = useI18n();
  const {
    analysisEnabled,
    setAnalysisEnabled,
    proactiveTriggerEnabled,
    setProactiveTriggerEnabled,
    privacyFilterEnabled,
    setPrivacyFilterEnabled,
    liveContext,
    privacyAssessment,
    screenCapturePermission,
  } = usePerceptionStatus();

  return (
    <section className="tab-panel-enter">
      <header>
        <p className="text-xs font-medium text-[#64b5f6]">{t.perception.eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight text-white">
          {t.perception.title}
        </h1>
        <p className="mt-2 text-[13px] leading-5 text-white/45">
          {t.perception.description}
        </p>
      </header>

      <SectionHeading>{t.perception.sections.capture}</SectionHeading>
      <SettingRow
        title={t.perception.analysis.label}
        subtitle={t.perception.analysis.subtitle}
      >
        <IosSwitch
          checked={analysisEnabled}
          onChange={setAnalysisEnabled}
          label={t.perception.analysis.switchLabel}
        />
      </SettingRow>
      <SettingRow
        title={t.perception.proactiveTrigger.label}
        subtitle={t.perception.proactiveTrigger.subtitle}
      >
        <IosSwitch
          checked={proactiveTriggerEnabled}
          onChange={setProactiveTriggerEnabled}
          label={t.perception.proactiveTrigger.switchLabel}
        />
      </SettingRow>
      <SettingRow
        title={t.perception.privacyFilter.label}
        subtitle={t.perception.privacyFilter.subtitle}
      >
        <IosSwitch
          checked={privacyFilterEnabled}
          onChange={setPrivacyFilterEnabled}
          label={t.perception.privacyFilter.switchLabel}
        />
      </SettingRow>

      <SectionHeading>{t.perception.sections.liveContext}</SectionHeading>
      <LiveContextLog liveContext={liveContext} labels={t.perception.liveContext} />

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_180px] gap-3 max-sm:grid-cols-1">
        <PrivacyFilterCard
          enabled={privacyFilterEnabled}
          assessment={privacyAssessment}
          permissionStatus={screenCapturePermission}
          labels={t.perception.privacyCard}
        />
        <StatusPill tone={privacyAssessment?.isSensitive ? "blue" : analysisEnabled ? "green" : "blue"}>
          {privacyAssessment?.isSensitive
            ? t.perception.status.sensitiveBlocked
            : analysisEnabled
              ? t.perception.status.analysisWaiting
              : t.perception.status.analysisPaused}
        </StatusPill>
      </div>
    </section>
  );
}
