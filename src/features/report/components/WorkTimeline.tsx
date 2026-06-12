import { TimelineList } from "../../../ui/TimelineList";
import type { WorkTimelineItem } from "../model/types";

type WorkTimelineProps = {
  items: WorkTimelineItem[];
};

export function WorkTimeline({ items }: WorkTimelineProps) {
  return <TimelineList items={items} />;
}
