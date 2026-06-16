import { cn } from "../../lib/utils/cn";

export type SegmentedOption<TValue extends string> = {
  label: string;
  value: TValue;
};

type SegmentedControlProps<TValue extends string> = {
  value: TValue;
  options: Array<SegmentedOption<TValue>>;
  onChange: (value: TValue) => void;
  className?: string;
};

export function SegmentedControl<TValue extends string>({
  value,
  options,
  onChange,
  className,
}: SegmentedControlProps<TValue>) {
  return (
    <div
      role="radiogroup"
      className={cn(
        "grid overflow-hidden rounded-[12px] border border-[color:var(--shell-border-strong)] bg-[color:var(--shell-panel-strong)]",
        options.length === 3 ? "grid-cols-3" : "grid-cols-2",
        className,
      )}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative px-2 py-2 text-center text-[11px] font-medium transition",
              index > 0 &&
                "border-l border-[color:var(--shell-border-strong)]",
              selected
                ? "border-[color:var(--shell-selection-border)] bg-[color:var(--shell-selection-bg)] text-[color:var(--shell-selection-text)] shadow-[inset_0_0_0_1px_var(--shell-selection-border)]"
                : "text-[color:var(--shell-ink-muted)] hover:bg-[color:var(--shell-row-hover)] hover:text-[color:var(--shell-ink)]",
              selected && "font-semibold",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
