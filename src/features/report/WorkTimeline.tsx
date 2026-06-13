import { TimelineList } from "../../ui";
import type { WorkTimelineItem } from "./types";

type WorkTimelineProps = {
  items: WorkTimelineItem[];
  loading: boolean;
};

export function WorkTimeline({ items, loading }: WorkTimelineProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4 text-[13px] text-white/42">
        타임라인을 불러오는 중입니다.
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4 text-[13px] text-white/42">
        아직 저장된 타임라인이 없습니다.
      </div>
    );
  }

  return <TimelineList items={items} />;
}
