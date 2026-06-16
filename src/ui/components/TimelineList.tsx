type TimelineItem = {
  id: string;
  time: string;
  title: string;
  color: string;
};

type TimelineListProps = {
  items: TimelineItem[];
};

export function TimelineList({ items }: TimelineListProps) {
  return (
    <div className="ml-2 border-l-2 border-[color:var(--shell-border-subtle)] pl-[18px]">
      {items.map((item) => (
        <div key={item.id} className="relative mb-5 last:mb-0">
          <span
            className={`absolute -left-6 top-1 size-2 rounded-full ${item.color}`}
          />
          <div className="text-[11px] text-[color:var(--shell-ink-faint)]">
            {item.time}
          </div>
          <div className="mt-0.5 text-[13px] leading-5 text-[color:var(--shell-ink)]">
            {item.title}
          </div>
        </div>
      ))}
    </div>
  );
}
