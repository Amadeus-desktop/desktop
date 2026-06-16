import { cn } from "../../../lib/utils/cn";
import type { ReportMetric } from "../types";
import { reportMetricToneStyles, reportPanelStyles } from "../ui/panelStyles";

type CareSummaryGridProps = {
  metrics: ReportMetric[];
};

export function CareSummaryGrid({ metrics }: CareSummaryGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5 max-sm:grid-cols-1">
      {metrics.map((metric) => (
        <article
          key={metric.id}
          className={cn(
            reportPanelStyles.card,
            reportMetricToneStyles[metric.tone].card,
          )}
        >
          <div className={reportPanelStyles.cardLabel}>{metric.label}</div>
          <div
            className={cn(
              reportPanelStyles.cardValue,
              reportMetricToneStyles[metric.tone].value,
            )}
          >
            {metric.value}
          </div>
        </article>
      ))}
    </div>
  );
}
