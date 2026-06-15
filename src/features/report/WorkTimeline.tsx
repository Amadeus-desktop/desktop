import { TimelineList } from "../../ui";
import type { AppLocale } from "../../i18n";
import type { WorkTimelineItem } from "./types";

type WorkTimelineProps = {
  items: WorkTimelineItem[];
  loading: boolean;
  labels: AppLocale["report"]["timeline"];
};

export function WorkTimeline({ items, loading, labels }: WorkTimelineProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-[#333338] bg-[#222226] p-4 text-[13px] text-white/42">
        {labels.loading}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-[#333338] bg-[#222226] p-4 text-[13px] text-white/42">
        {labels.empty}
      </div>
    );
  }

  return <TimelineList items={items} />;
}
