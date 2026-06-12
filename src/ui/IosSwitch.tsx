type IosSwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
};

export function IosSwitch({ checked, onChange, label }: IosSwitchProps) {
  return (
    <label className="ios-switch" aria-label={label}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      <span className="ios-switch-slider" />
    </label>
  );
}

