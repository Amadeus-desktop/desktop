import type { AppLocale } from "../../../i18n";
import { glassStyles, shellText } from "../../../ui/theme/shellStyles";
import type { LiveContextStatus } from "../types";

type LiveContextLogProps = {
  liveContext: LiveContextStatus;
  labels: AppLocale["perception"]["liveContext"];
  loading?: boolean;
  loadingLabel?: string;
};

const rowKeys = [
  "activeApp",
  "windowTitle",
  "stateSync",
  "category",
] as const satisfies ReadonlyArray<keyof LiveContextStatus>;

export function LiveContextLog({
  liveContext,
  labels,
  loading = false,
  loadingLabel,
}: LiveContextLogProps) {
  return (
    <div
      className={`overflow-hidden px-3.5 py-1 ${glassStyles.radiusCard} border ${glassStyles.panel}`}
    >
      {loading && loadingLabel ? (
        <p
          className={`border-b border-[color:var(--shell-border-subtle)] py-2.5 text-[10px] ${shellText.faint}`}
        >
          {loadingLabel}
        </p>
      ) : null}
      {rowKeys.map((key) => (
        <div
          key={key}
          className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 border-b border-[color:var(--shell-border-subtle)] py-2.5 last:border-b-0"
        >
          <div className={`text-[10px] ${shellText.faint}`}>{labels[key]}</div>
          <div className={`min-w-0 break-words text-[12px] leading-5 ${shellText.primary}`}>
            {liveContext[key]}
          </div>
        </div>
      ))}
    </div>
  );
}
