import type { SettingSelectOption } from "./SettingSelect";
import { SettingSelect } from "./SettingSelect";

type MacSelectProps<TValue extends string> = {
  value: TValue;
  options: Array<SettingSelectOption<TValue>>;
  onChange: (value: TValue) => void;
  className?: string;
};

/** @deprecated Use SettingSelect — kept as alias for existing imports */
export function MacSelect<TValue extends string>(props: MacSelectProps<TValue>) {
  return <SettingSelect {...props} />;
}

export { SettingSelect };
