import { PanelHeader, SectionHeading } from "../../../ui";
import { useI18n } from "../../../i18n";
import { CareSummaryGrid } from "./CareSummaryGrid";
import { DailyCareClosing } from "./DailyCareClosing";
import { DailyCareHero } from "./DailyCareHero";
import { buildDailyCareInsight } from "../lib/report";
import { WorkTimeline } from "./WorkTimeline";
import { useReport } from "../hooks/useReport";

export function ReportPanel() {
  const t = useI18n();
  const { events, reportMetrics, workTimeline, timelineState } = useReport();
  const insight = buildDailyCareInsight(events, t);

  return (
    <section className="motion-safe-animate animate-tab-panel-enter">
      <PanelHeader
        eyebrow={t.report.eyebrow}
        title={t.report.title}
        description={t.report.description}
      />

      <DailyCareHero prompt={t.report.intro.prompt} />

      <SectionHeading>{t.report.sections.summary}</SectionHeading>
      <CareSummaryGrid metrics={reportMetrics} />

      <SectionHeading>{t.report.sections.moments}</SectionHeading>
      <WorkTimeline
        items={workTimeline}
        loading={timelineState === "loading"}
        labels={t.report.timeline}
      />

      <SectionHeading>{t.report.sections.closing}</SectionHeading>
      <DailyCareClosing
        title={t.report.closingNote.title}
        keywordsTitle={t.report.emotionalKeywords.title}
        keywords={insight.keywords}
        closingNote={insight.closingNote}
      />
    </section>
  );
}
