import { useState, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { glassStyles } from "./glassStyles";
import { SettingsGroupContext } from "./SettingsGroup";

type AdvancedSectionProps = {
  title: string;
  hint: string;
  children: ReactNode;
  defaultOpen?: boolean;
};

export function AdvancedSection({
  title,
  hint,
  children,
  defaultOpen = false,
}: AdvancedSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="mt-5">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition",
          glassStyles.radiusCard,
          "border border-[#333338] bg-[#222226]",
          "hover:border-[#48484f] hover:bg-[#2a2a2e]",
        )}
      >
        <span className="min-w-0">
          <span className="block text-xs font-medium text-white">{title}</span>
          <span className="mt-0.5 block text-[10px] leading-4 text-white/42">
            {hint}
          </span>
        </span>
        <span
          className={cn(
            "shrink-0 text-[11px] text-white/45 transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>
      {open ? (
        <SettingsGroupContext.Provider value={false}>
          <div className="mt-2 space-y-2">{children}</div>
        </SettingsGroupContext.Provider>
      ) : null}
    </section>
  );
}
