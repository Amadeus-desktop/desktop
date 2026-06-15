import { Cloud, Cpu } from "lucide-react";
import { useI18n } from "../../../i18n";
import { cn } from "../../../lib/utils/cn";
import { shellText } from "../../../ui";
import type { ModelRoute } from "../types";

export type PrimaryModelRoute = "api-first" | "local-first";

type ModelRoutePickerProps = {
  value: ModelRoute;
  onChange: (value: PrimaryModelRoute) => void;
};

const ROUTE_OPTIONS: Array<{
  value: PrimaryModelRoute;
  icon: typeof Cloud;
}> = [
  { value: "api-first", icon: Cloud },
  { value: "local-first", icon: Cpu },
];

export function toPrimaryModelRoute(value: ModelRoute): PrimaryModelRoute {
  return value === "local-first" ? "local-first" : "api-first";
}

export function ModelRoutePicker({ value, onChange }: ModelRoutePickerProps) {
  const t = useI18n();
  const selected = toPrimaryModelRoute(value);
  const options = t.onboarding.modelRoute.options;

  return (
    <div className="grid grid-cols-2 gap-2">
      {ROUTE_OPTIONS.map(({ value: route, icon: Icon }) => {
        const isSelected = selected === route;
        const copy = route === "api-first" ? options.api : options.local;

        return (
          <button
            key={route}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(route)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-[16px] border px-3 py-3 transition active:scale-[0.98]",
              isSelected
                ? "border-[color:rgb(var(--accent-rgb)/0.45)] bg-[color:rgb(var(--accent-rgb)/0.1)]"
                : "border-[color:var(--shell-border-subtle)] bg-[color:var(--shell-panel-strong)] hover:border-[color:rgb(var(--accent-rgb)/0.25)] hover:bg-[color:rgb(var(--accent-rgb)/0.05)]",
            )}
          >
            <span
              className={cn(
                "flex size-9 items-center justify-center rounded-[12px] border",
                isSelected
                  ? "border-[color:rgb(var(--accent-rgb)/0.35)] bg-[color:rgb(var(--accent-rgb)/0.14)] text-[color:var(--accent-soft)]"
                  : "border-[color:var(--shell-border-subtle)] bg-[color:var(--shell-panel)] text-[color:var(--shell-ink-muted)]",
              )}
            >
              <Icon className="size-4" strokeWidth={2} />
            </span>
            <span
              className={cn(
                "text-[11px] font-semibold leading-tight",
                isSelected ? "text-[color:var(--accent-soft)]" : shellText.primary,
              )}
            >
              {copy.title}
            </span>
            <span className={cn("text-center text-[9px] leading-relaxed", shellText.faint)}>
              {copy.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
