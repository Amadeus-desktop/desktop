import { useI18n } from "../../../i18n";
import { SegmentedControl, SettingRow } from "../../../ui";
import { useSettings } from "../hooks/useSettings";

export function AppearancePicker() {
  const t = useI18n();
  const { appearance, setAppearance, appearanceOptions } = useSettings();

  return (
    <SettingRow
      layout="stack"
      title={t.settings.appearance.label}
      subtitle={t.settings.appearance.subtitle}
    >
      <SegmentedControl
        value={appearance}
        options={appearanceOptions(t)}
        onChange={setAppearance}
      />
    </SettingRow>
  );
}
