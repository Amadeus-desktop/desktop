import { useState } from "react";
import { Button, TimelineList } from "../../../ui";
import type { AppLocale } from "../../../i18n";
import type { WorkTimelineItem } from "../types";

const DEFAULT_VISIBLE_COUNT = 5;

type WorkTimelineProps = {
  items: WorkTimelineItem[];
  loading: boolean;
  labels: AppLocale["report"]["timeline"];
};

export function WorkTimeline({ items, loading, labels }: WorkTimelineProps) {
  const [expanded, setExpanded] = useState(false);
  const hasHiddenItems = items.length > DEFAULT_VISIBLE_COUNT;
  const visibleItems =
    expanded || !hasHiddenItems
      ? items
      : items.slice(0, DEFAULT_VISIBLE_COUNT);
  const hiddenCount = Math.max(items.length - DEFAULT_VISIBLE_COUNT, 0);

  if (loading) {
    return (
      <div className="rounded-[18px] border border-[#333338] bg-[#222226] p-4 text-[13px] text-white/42">
        {labels.loading}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-[18px] border border-[#333338] bg-[#222226] p-4 text-[13px] text-white/42">
        {labels.empty}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <TimelineList items={visibleItems} />
      {hasHiddenItems ? (
        <Button
          variant="ghost"
          size="md"
          className="w-full border border-[#333338] bg-[#222226] text-white/62 hover:text-white"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded
            ? labels.collapse
            : labels.expand.replace("{count}", String(hiddenCount))}
        </Button>
      ) : null}
    </div>
  );
}
