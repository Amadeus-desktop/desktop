import type { AppLocale } from "../../../i18n";
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
    <div className="overflow-hidden rounded-[18px] border border-[#333338] bg-[#222226] px-3.5 py-1">
      {loading && loadingLabel ? (
        <p className="border-b border-[#333338]/90 py-2.5 text-[10px] text-white/42">
          {loadingLabel}
        </p>
      ) : null}
      {rowKeys.map((key) => (
        <div
          key={key}
          className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 border-b border-[#333338]/90 py-2.5 last:border-b-0"
        >
          <div className="text-[10px] text-white/40">{labels[key]}</div>
          <div className="min-w-0 break-words text-[12px] leading-5 text-white/78">
            {liveContext[key]}
          </div>
        </div>
      ))}
    </div>
  );
}
