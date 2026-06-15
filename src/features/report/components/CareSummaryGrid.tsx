import { cn } from "../../../lib/utils/cn";
import type { ReportMetric } from "../types";

type CareSummaryGridProps = {
  metrics: ReportMetric[];
};

const toneClass: Record<ReportMetric["tone"], string> = {
  rose: "from-[color:rgb(var(--accent-rgb)/0.18)] to-[#2a2228] border-[color:rgb(var(--accent-rgb)/0.22)]",
  lavender: "from-[#c4b5fd]/16 to-[#24222a] border-[#c4b5fd]/20",
  peach: "from-[#fdba74]/14 to-[#2a2420] border-[#fdba74]/18",
  mint: "from-[#86efac]/14 to-[#202822] border-[#86efac]/18",
};

const valueToneClass: Record<ReportMetric["tone"], string> = {
  rose: "text-[color:var(--accent-soft)]",
  lavender: "text-[#ddd6fe]",
  peach: "text-[#fed7aa]",
  mint: "text-[#bbf7d0]",
};

export function CareSummaryGrid({ metrics }: CareSummaryGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5 max-sm:grid-cols-1">
      {metrics.map((metric) => (
        <article
          key={metric.id}
          className={cn(
            "rounded-[18px] border bg-gradient-to-br p-3.5",
            toneClass[metric.tone],
          )}
        >
          <div className="text-[10px] leading-4 text-white/48">{metric.label}</div>
          <div className={cn("mt-1 text-lg font-semibold tracking-tight", valueToneClass[metric.tone])}>
            {metric.value}
          </div>
        </article>
      ))}
    </div>
  );
}
