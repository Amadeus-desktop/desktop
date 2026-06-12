import { reportMetrics, workTimeline } from "../model/report";

export function useReport() {
  return {
    reportMetrics,
    workTimeline,
  };
}

