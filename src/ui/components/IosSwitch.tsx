type IosSwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
};

export function IosSwitch({ checked, onChange, label }: IosSwitchProps) {
  return (
    <label
      className="relative inline-flex h-[26px] w-[44px] shrink-0"
      aria-label={label}
    >
      <input
        type="checkbox"
        className="peer pointer-events-none absolute opacity-0"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      <span
        className="absolute inset-0 rounded-full bg-[rgb(120_120_128/0.32)] transition-[background,box-shadow] duration-150 before:absolute before:left-0.5 before:top-0.5 before:size-[22px] before:rounded-full before:bg-white before:shadow-[0_2px_6px_rgb(0_0_0/0.3)] before:transition-transform before:duration-150 before:content-[''] peer-checked:bg-gradient-to-b peer-checked:from-[color:var(--accent-gradient-from)] peer-checked:to-[color:var(--accent-gradient-to)] peer-checked:shadow-[0_2px_10px_rgb(var(--accent-rgb)/0.35)] peer-checked:before:translate-x-[18px] peer-focus-visible:shadow-[0_0_0_3px_rgb(var(--accent-rgb)/0.32)]"
      />
    </label>
  );
}
