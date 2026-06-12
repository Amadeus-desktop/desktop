type MacSelectProps<TValue extends string> = {
  value: TValue;
  options: Array<{ label: string; value: TValue }>;
  onChange: (value: TValue) => void;
};

export function MacSelect<TValue extends string>({
  value,
  options,
  onChange,
}: MacSelectProps<TValue>) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.currentTarget.value as TValue)}
      className="max-w-[190px] rounded-md border border-white/12 bg-white/8 px-2.5 py-1.5 text-xs text-white outline-none transition focus:border-[#007aff]"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} className="text-black">
          {option.label}
        </option>
      ))}
    </select>
  );
}

