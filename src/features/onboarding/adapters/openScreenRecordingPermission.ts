import { getScreenCapturePermissionStatus, requestScreenCapturePermission } from "../../context";
import { openScreenRecordingSettings } from "./openScreenRecordingSettings";

const POLL_INTERVAL_MS = 800;
const POLL_ATTEMPTS = 12;

export async function ensureScreenCapturePermission(): Promise<boolean> {
  return ensureScreenCapturePermissionWithDependencies({
    requestPermission: requestScreenCapturePermission,
    getStatus: getScreenCapturePermissionStatus,
    openSettings: openScreenRecordingSettings,
    sleep: (durationMs) => new Promise<void>((resolve) => setTimeout(resolve, durationMs)),
    pollAttempts: POLL_ATTEMPTS,
  });
}

type EnsureScreenCapturePermissionDependencies = {
  requestPermission: typeof requestScreenCapturePermission;
  getStatus: typeof getScreenCapturePermissionStatus;
  openSettings: typeof openScreenRecordingSettings;
  sleep: (durationMs: number) => Promise<void>;
  pollAttempts: number;
};

export async function ensureScreenCapturePermissionWithDependencies({
  requestPermission,
  getStatus,
  openSettings,
  sleep,
  pollAttempts,
}: EnsureScreenCapturePermissionDependencies): Promise<boolean> {
  let status = await requestPermission();
  if (status.granted) return true;

  try {
    await openSettings();
  } catch {
    return false;
  }

  for (let attempt = 0; attempt < pollAttempts; attempt += 1) {
    await sleep(POLL_INTERVAL_MS);
    status = await getStatus();
    if (status.granted) return true;
  }

  return false;
}
