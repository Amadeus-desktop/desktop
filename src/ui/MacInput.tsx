type MacInputProps = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  className?: string;
};

export function MacInput({ value, onChange, label, className }: MacInputProps) {
  return (
    <input
      aria-label={label}
      type="text"
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
      className={
        className ??
        "w-[100px] rounded-md border border-white/12 bg-white/8 px-2.5 py-1.5 text-right text-xs text-white outline-none transition focus:border-[#007aff]"
      }
    />
  );
}

