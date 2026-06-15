import { SectionHeading } from "../../ui";
import { useI18n } from "../../i18n";
import { FocusSummaryGrid } from "./FocusSummaryGrid";
import { WorkTimeline } from "./WorkTimeline";
import { useReport } from "./useReport";

export function ReportPanel() {
  const t = useI18n();
  const { reportMetrics, workTimeline, timelineState } = useReport();

  return (
    <section className="tab-panel-enter">
      <header>
        <p className="text-xs font-medium text-[#64b5f6]">{t.report.eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight text-white">
          {t.report.title}
        </h1>
        <p className="mt-2 text-[13px] leading-5 text-white/45">
          {t.report.description}
        </p>
      </header>

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
