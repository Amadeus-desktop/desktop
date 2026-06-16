import { RefreshCw } from "lucide-react";
import { Button, PanelHeader, SectionHeading } from "../../../ui";
import { useI18n } from "../../../i18n";
import { CareSummaryGrid } from "./CareSummaryGrid";
import { DailyCareClosing } from "./DailyCareClosing";
import { DailyCareHero } from "./DailyCareHero";
import { buildDailyCareInsight } from "../lib/report";
import { WorkTimeline } from "./WorkTimeline";
import { useReport } from "../hooks/useReport";

export function ReportPanel() {
  const t = useI18n();
  const {
    events,
    reportMetrics,
    workTimeline,
    timelineState,
    refreshReport,
  } = useReport();
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

      <div className="mb-2.5 mt-5 flex items-center justify-between gap-3">
        <SectionHeading className="mb-0 mt-0">
          {t.report.sections.moments}
        </SectionHeading>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2.5 text-white/52 hover:text-white"
          onClick={refreshReport}
          aria-label={t.report.timeline.refresh}
          title={t.report.timeline.refresh}
          disabled={timelineState === "loading"}
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t.report.timeline.refresh}</span>
        </Button>
      </div>
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
