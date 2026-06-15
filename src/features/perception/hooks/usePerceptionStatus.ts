import { useContextSnapshot } from "../../context";

export function usePerceptionStatus() {
  const { liveContext, privacyAssessment, screenCapturePermission, status } =
    useContextSnapshot();

  return {
    liveContext,
    privacyAssessment,
    screenCapturePermission,
    contextStatus: status,
  };
}
