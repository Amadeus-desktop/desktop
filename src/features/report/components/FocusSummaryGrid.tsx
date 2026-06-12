import { ReportCard } from "../../../ui/ReportCard";
import type { ReportMetric } from "../model/types";

type FocusSummaryGridProps = {
  metrics: ReportMetric[];
};

export function FocusSummaryGrid({ metrics }: FocusSummaryGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
      {metrics.map((metric) => (
        <ReportCard
          key={metric.id}
          label={metric.label}
          value={metric.value}
          accent={metric.accent}
        />
      ))}
    </div>
  );
}
