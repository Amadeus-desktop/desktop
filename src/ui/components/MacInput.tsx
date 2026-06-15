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
        "h-8 w-full min-w-0 max-w-[9.5rem] rounded-[10px] border border-[color:var(--shell-border-strong)] bg-[color:var(--shell-panel-strong)] px-2.5 text-right text-[11px] text-[color:var(--shell-ink)] outline-none transition focus:border-[color:rgb(var(--accent-rgb)/0.45)] focus:ring-2 focus:ring-[color:rgb(var(--accent-rgb)/0.12)]"
      }
    />
  );
}

