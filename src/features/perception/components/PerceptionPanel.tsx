import { useI18n } from "../../../i18n";
import {
  AdvancedSection,
  IosSwitch,
  MacInput,
  PanelHeader,
  SectionHeading,
  SettingRow,
  SettingsGroup,
} from "../../../ui";
import {
  formatPrivacyKeywordsInput,
  parsePrivacyKeywordsInput,
} from "../../../domain/context";
import { shellFieldClass } from "../../../ui/theme/shellStyles";
import { useSettings } from "../../settings";
import { LiveContextLog } from "./LiveContextLog";
import { PerceptionStatusBar } from "./PerceptionStatusBar";
import { usePerceptionStatus } from "../hooks/usePerceptionStatus";

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

  const statusTone =
    contextStatus === "error"
      ? "error"
      : privacyAssessment?.isSensitive
        ? "blocked"
        : analysisEnabled
          ? "active"
          : "paused";

  return (
    <section className="motion-safe-animate animate-tab-panel-enter">
      <PanelHeader
        eyebrow={t.perception.eyebrow}
        title={t.perception.title}
        description={t.perception.description}
      />

      <SectionHeading>{t.perception.sections.basics}</SectionHeading>
      <SettingsGroup>
        <SettingRow
          variant="primary"
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
            variant="nested"
            layout="stack"
            title={t.perception.privacyKeywords.label}
            subtitle={t.perception.privacyKeywords.subtitle}
          >
            <MacInput
              value={formatPrivacyKeywordsInput(customPrivacyKeywords)}
              onChange={(value) =>
                setCustomPrivacyKeywords(parsePrivacyKeywordsInput(value))
              }
              label={t.perception.privacyKeywords.inputLabel}
              className={shellFieldClass}
            />
          </SettingRow>
        ) : null}
      </SettingsGroup>

      <PerceptionStatusBar
        statusLabel={statusLabel}
        tone={statusTone}
        enabled={privacyFilterEnabled}
        assessment={privacyAssessment}
        permissionStatus={screenCapturePermission}
        labels={t.perception.privacyCard}
      />

      <AdvancedSection
        title={t.perception.advanced.toggle}
        hint={t.perception.advanced.hint}
      >
        <SectionHeading>{t.perception.sections.details}</SectionHeading>
        <LiveContextLog
          liveContext={liveContext}
          labels={t.perception.liveContext}
          loading={contextStatus === "loading" && analysisEnabled}
          loadingLabel={t.perception.status.analysisLoading}
        />
      </AdvancedSection>
    </section>
  );
}
