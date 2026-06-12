import { SectionHeading } from "../../ui/SectionHeading";
import { FocusSummaryGrid } from "./FocusSummaryGrid";
import { WorkTimeline } from "./WorkTimeline";
import { useReport } from "./useReport";

export function ReportPanel() {
  const { reportMetrics, workTimeline, timelineState } = useReport();

  return (
    <section className="tab-panel-enter">
      <header>
        <p className="text-xs font-medium text-[#64b5f6]">Daily Review</p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight text-white">
          작업 리포트
        </h1>
        <p className="mt-2 text-[13px] leading-5 text-white/45">
          오늘의 집중 시간과 발화 개입 이력을 한 화면에서 확인합니다.
        </p>
      </header>

      <SectionHeading>Summary</SectionHeading>
      <FocusSummaryGrid metrics={reportMetrics} />

      <SectionHeading>Timeline</SectionHeading>
      <WorkTimeline items={workTimeline} loading={timelineState === "loading"} />
    </section>
  );
}
