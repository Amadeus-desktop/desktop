import { PanelHeader, SectionHeading } from "../../ui";
import { useI18n } from "../../i18n";
import { FocusSummaryGrid } from "./FocusSummaryGrid";
import { WorkTimeline } from "./WorkTimeline";
import { useReport } from "./useReport";

export function ReportPanel() {
  const t = useI18n();
  const { reportMetrics, workTimeline, timelineState } = useReport();

  return (
    <section className="tab-panel-enter">
      <PanelHeader
        eyebrow={t.report.eyebrow}
        title={t.report.title}
        description={t.report.description}
      />

      <SectionHeading>{t.report.sections.summary}</SectionHeading>
      <FocusSummaryGrid metrics={reportMetrics} />

      <SectionHeading>{t.report.sections.timeline}</SectionHeading>
      <WorkTimeline
        items={workTimeline}
        loading={timelineState === "loading"}
        labels={t.report.timeline}
      />
    </section>
  );
}
