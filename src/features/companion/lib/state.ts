import { formatLocaleTime } from "../../../i18n";
import type { CompanionMode, LocalTimelineEvent, TimelineEventType } from "../types";

export function createTimelineEvent(
  type: TimelineEventType,
  mode: CompanionMode,
  label: string,
): LocalTimelineEvent {
  const now = new Date();

  return {
    id: `${type}-${now.getTime()}-${Math.random().toString(16).slice(2)}`,
    type,
    mode,
    label,
    createdAt: formatLocaleTime(now),
  };
}
