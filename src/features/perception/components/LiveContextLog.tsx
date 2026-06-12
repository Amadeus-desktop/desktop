import type { LiveContextStatus } from "../model/types";

type LiveContextLogProps = {
  liveContext: LiveContextStatus;
};

const rows: Array<{
  label: string;
  key: keyof LiveContextStatus;
}> = [
  { label: "현재 앱", key: "activeApp" },
  { label: "상태 동기화", key: "stateSync" },
  { label: "Vision Core", key: "visionCore" },
];

export function LiveContextLog({ liveContext }: LiveContextLogProps) {
  return (
    <div className="rounded-lg border border-white/6 bg-black/18 p-4">
      {rows.map((row) => (
        <div
          key={row.key}
          className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 border-b border-white/6 py-2 first:pt-0 last:border-b-0 last:pb-0"
        >
          <div className="text-[11px] text-white/35">{row.label}</div>
          <div className="min-w-0 break-words text-[12px] leading-5 text-white/78">
            {liveContext[row.key]}
          </div>
        </div>
      ))}
    </div>
  );
}
