import type { AppLocale } from "../../i18n";
import type { LiveContextStatus } from "./types";

type LiveContextLogProps = {
  liveContext: LiveContextStatus;
  labels: AppLocale["perception"]["liveContext"];
};

const rowKeys = [
  "activeApp",
  "windowTitle",
  "stateSync",
  "category",
] as const satisfies ReadonlyArray<keyof LiveContextStatus>;

export function LiveContextLog({ liveContext, labels }: LiveContextLogProps) {
  return (
    <div className="rounded-lg border border-white/6 bg-black/18 p-4">
      {rowKeys.map((key) => (
        <div
          key={key}
          className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 border-b border-white/6 py-2 first:pt-0 last:border-b-0 last:pb-0"
        >
          <div className="text-[11px] text-white/35">{labels[key]}</div>
          <div className="min-w-0 break-words text-[12px] leading-5 text-white/78">
            {liveContext[key]}
          </div>
        </div>
      ))}
    </div>
  );
}
