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
    <div className="ml-2 border-l-2 border-white/8 pl-[18px]">
      {items.map((item) => (
        <div key={item.id} className="relative mb-5 last:mb-0">
          <span
            className={`absolute -left-6 top-1 size-2 rounded-full ${item.color}`}
          />
          <div className="text-[11px] text-white/40">{item.time}</div>
          <div className="mt-0.5 text-[13px] leading-5 text-white">
            {item.title}
          </div>
        </div>
      ))}
    </div>
  );
}

