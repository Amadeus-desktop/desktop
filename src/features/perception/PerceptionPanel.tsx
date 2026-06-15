import { IosSwitch, MacInput, PanelHeader, SectionHeading, SettingRow, StatusPill } from "../../ui";
import {
  formatPrivacyKeywordsInput,
  parsePrivacyKeywordsInput,
} from "../../domain/context";
import { useI18n } from "../../i18n";
import { useSettings } from "../settings/useSettings";
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
    customPrivacyKeywords,
    setCustomPrivacyKeywords,
  } = useSettings();
  const {
    liveContext,
    privacyAssessment,
    screenCapturePermission,
    contextStatus,
  } = usePerceptionStatus();

  const statusLabel =
    contextStatus === "error"
      ? t.perception.status.analysisError
      : contextStatus === "loading"
        ? t.perception.status.analysisLoading
        : privacyAssessment?.isSensitive
          ? t.perception.status.sensitiveBlocked
          : analysisEnabled
            ? t.perception.status.analysisWaiting
            : t.perception.status.analysisPaused;

  return (
    <section className="tab-panel-enter">
      <PanelHeader
        eyebrow={t.perception.eyebrow}
        title={t.perception.title}
        description={t.perception.description}
      />

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
      {privacyFilterEnabled ? (
        <SettingRow
          title={t.perception.privacyKeywords.label}
          subtitle={t.perception.privacyKeywords.subtitle}
        >
          <MacInput
            value={formatPrivacyKeywordsInput(customPrivacyKeywords)}
            onChange={(value) =>
              setCustomPrivacyKeywords(parsePrivacyKeywordsInput(value))
            }
            label={t.perception.privacyKeywords.inputLabel}
            className="min-w-[160px] max-w-[220px] rounded-md border border-white/12 bg-white/8 px-2 py-1 text-left text-[11px] text-white outline-none transition focus:border-[#007aff]"
          />
        </SettingRow>
      ) : null}

      <SectionHeading>{t.perception.sections.liveContext}</SectionHeading>
      <LiveContextLog
        liveContext={liveContext}
        labels={t.perception.liveContext}
        loading={contextStatus === "loading" && analysisEnabled}
        loadingLabel={t.perception.status.analysisLoading}
      />

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_180px] gap-3 max-sm:grid-cols-1">
        <PrivacyFilterCard
          enabled={privacyFilterEnabled}
          assessment={privacyAssessment}
          permissionStatus={screenCapturePermission}
          labels={t.perception.privacyCard}
        />
        <StatusPill
          tone={
            contextStatus === "error"
              ? "blue"
              : privacyAssessment?.isSensitive
                ? "blue"
                : analysisEnabled
                  ? "green"
                  : "blue"
          }
        >
          {statusLabel}
        </StatusPill>
      </div>
    </section>
  );
}
