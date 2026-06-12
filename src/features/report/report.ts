import type { ReportMetric, WorkTimelineItem } from "./types";

export const reportMetrics: ReportMetric[] = [
  {
    id: "focus-time",
    label: "오늘 함께 달린 집중 시간",
    value: "3시간 45분",
    accent: "text-[#34c759]",
  },
  {
    id: "utterances",
    label: "에밀리아가 건넨 넌지시 응원",
    value: "6회",
    accent: "text-[#bf5af2]",
  },
];

export const workTimeline: WorkTimelineItem[] = [
  {
    id: "start-doc",
    time: "오후 09:15",
    title: "공무 보고서 작성 진입 확인",
    color: "bg-[#007aff]",
  },
  {
    id: "milestone",
    time: "오후 11:15",
    title: "2시간 장기 집중 인지 → 에밀리아 격려 트리거 작동",
    color: "bg-[#ffbd2e]",
  },
];
