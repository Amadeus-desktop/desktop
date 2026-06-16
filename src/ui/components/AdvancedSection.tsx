import { useState, type ReactNode } from "react";
import { cn } from "../../lib/utils/cn";
import { glassStyles, shellText } from "../theme/shellStyles";
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
          glassStyles.row,
        )}
      >
        <span className="min-w-0">
          <span className={cn("block text-xs font-medium", shellText.primary)}>
            {title}
          </span>
          <span className={cn("mt-0.5 block text-[10px] leading-4", shellText.faint)}>
            {hint}
          </span>
        </span>
        <span
          className={cn(
            "shrink-0 text-[11px] transition-transform duration-200",
            shellText.faint,
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
