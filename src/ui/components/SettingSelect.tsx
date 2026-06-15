import { useEffect, useId, useRef, useState } from "react";
import { cn } from "../../lib/utils/cn";

export type SettingSelectOption<TValue extends string> = {
  label: string;
  value: TValue;
};

type SettingSelectProps<TValue extends string> = {
  value: TValue;
  options: Array<SettingSelectOption<TValue>>;
  onChange: (value: TValue) => void;
  className?: string;
};

export function SettingSelect<TValue extends string>({
  value,
  options,
  onChange,
  className,
}: SettingSelectProps<TValue>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-8 min-w-[6.75rem] items-center justify-between gap-2 rounded-[10px] border px-2.5 transition",
          "border-[color:var(--shell-border-strong)] bg-[color:var(--shell-panel-strong)]",
          "text-[11px] font-medium text-[color:var(--shell-ink)]",
          "hover:border-[color:var(--shell-border)] hover:bg-[color:var(--shell-row-hover)]",
          open &&
            "border-[color:rgb(var(--accent-rgb)/0.45)] ring-2 ring-[color:rgb(var(--accent-rgb)/0.12)]",
        )}
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronIcon open={open} />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          className={cn(
            "absolute right-0 z-30 mt-1 min-w-full overflow-hidden rounded-[12px] border p-1 shadow-[0_12px_32px_rgb(0_0_0_/_0.28)]",
            "border-[color:var(--shell-border)] bg-[color:var(--shell-panel)]",
          )}
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <li key={option.value} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-[8px] px-2.5 py-1.5 text-left text-[11px] transition",
                    active
                      ? "bg-[color:rgb(var(--accent-rgb)/0.14)] font-semibold text-[color:var(--accent-soft)]"
                      : "font-medium text-[color:var(--shell-ink)] hover:bg-[color:var(--shell-row-hover)]",
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {active ? <CheckIcon /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden="true"
      className={cn(
        "size-3 shrink-0 text-[color:var(--shell-ink-faint)] transition-transform duration-200",
        open && "rotate-180",
      )}
    >
      <path
        d="M3 4.5 6 7.5 9 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden="true"
      className="size-3 shrink-0 text-[color:var(--accent-soft)]"
    >
      <path
        d="M2.5 6 5 8.5 9.5 3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
