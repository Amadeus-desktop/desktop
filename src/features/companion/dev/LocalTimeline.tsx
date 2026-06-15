import { formatLocaleTime } from "../../../i18n";
import type { CompanionLocale } from "../../../i18n";
import { companionStyles } from "../ui/styles";
import type { TimelineEvent } from "../../timeline/types";

type LocalTimelineProps = {
  events: TimelineEvent[];
  labels: CompanionLocale["dev"];
};

export function LocalTimeline({ events, labels }: LocalTimelineProps) {
  return (
    <aside className={companionStyles.devBox}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className={companionStyles.devLabel}>{labels.timeline}</h3>
        <span className="text-[10px] text-chat-faint dark:text-chat-faint-dark">
          {events.length}
        </span>
      </div>
      <div className="max-h-24 space-y-1 overflow-y-auto pr-1">
        {events.length === 0 ? (
          <p className="text-chat-xs text-chat-faint dark:text-chat-faint-dark">
            {labels.timelineEmpty}
          </p>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="grid grid-cols-[62px_1fr] gap-1.5 px-1 py-0.5 text-[10px]"
            >
              <span className="text-chat-faint dark:text-chat-faint-dark">
                {formatLocaleTime(new Date(event.occurredAt))}
              </span>
              <span className="min-w-0 truncate">
                <span className="font-medium text-chat-muted dark:text-chat-muted-dark">
                  {event.kind}
                </span>
                <span className="ml-1 text-chat-faint dark:text-chat-faint-dark">
                  {event.title}
                </span>
              </span>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
