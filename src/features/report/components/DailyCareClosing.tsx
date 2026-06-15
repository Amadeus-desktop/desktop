type DailyCareClosingProps = {
  title: string;
  keywordsTitle: string;
  keywords: string[];
  closingNote: string;
};

export function DailyCareClosing({
  title,
  keywordsTitle,
  keywords,
  closingNote,
}: DailyCareClosingProps) {
  return (
    <div className="space-y-2.5">
      <article className="rounded-[18px] border border-[#48484f] bg-[#222226] p-3.5">
        <div className="text-[10px] font-medium uppercase tracking-wide text-white/40">
          {keywordsTitle}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {keywords.map((keyword) => (
            <span
              key={keyword}
              className="rounded-full border border-[color:rgb(var(--accent-rgb)/0.25)] bg-[color:rgb(var(--accent-rgb)/0.10)] px-2.5 py-0.5 text-[11px] text-[color:var(--accent-soft)]"
            >
              {keyword}
            </span>
          ))}
        </div>
      </article>
      <article className="rounded-[18px] border border-[color:rgb(var(--accent-rgb)/0.20)] bg-gradient-to-br from-[color:rgb(var(--accent-rgb)/0.10)] to-[#222226] p-4">
        <div className="text-[10px] font-medium uppercase tracking-wide text-white/40">
          {title}
        </div>
        <p className="mt-2 text-[13px] leading-6 text-white/82">{closingNote}</p>
      </article>
    </div>
  );
}
