import { openUrl } from "@tauri-apps/plugin-opener";
import { isTauriRuntime } from "../../../lib/tauri/runtime";

const MACOS_SCREEN_RECORDING_SETTINGS =
  "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture";

export async function openScreenRecordingSettings() {
  if (!isTauriRuntime()) {
    window.open("https://support.apple.com/guide/mac-help/control-access-screen-system-audio-recording-mchld7879323/mac", "_blank");
    return;
  }

  await openUrl(MACOS_SCREEN_RECORDING_SETTINGS);
}
