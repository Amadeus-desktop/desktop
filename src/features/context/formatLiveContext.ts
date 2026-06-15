import type { AppLocale } from "../../i18n/types";
import { CONTEXT_IDLE_THRESHOLD_SECONDS } from "../../domain/context/constants";
import type { MacosContextSnapshot } from "./types";
import type { LiveContextStatus } from "../perception/types";

export function formatLiveContextStatus(
  snapshot: MacosContextSnapshot,
  windowTitle: string,
  labels: AppLocale["perception"]["contextLabels"],
): LiveContextStatus {
  return {
    activeApp: formatAppLabel(snapshot),
    windowTitle,
    stateSync: formatIdleState(snapshot.idleSeconds, labels),
    category: labels.categories[snapshot.category],
  };
}

function formatAppLabel(snapshot: MacosContextSnapshot) {
  if (!snapshot.bundleIdentifier) {
    return snapshot.appName;
  }

  return `${snapshot.appName} (${snapshot.bundleIdentifier})`;
}

function formatIdleState(
  idleSeconds: number,
  labels: AppLocale["perception"]["contextLabels"],
) {
  if (idleSeconds < CONTEXT_IDLE_THRESHOLD_SECONDS) {
    return labels.idleActive.replace(
      "{seconds}",
      String(Math.round(idleSeconds)),
    );
  }

  return labels.idlePaused.replace(
    "{minutes}",
    String(Math.round(idleSeconds / 60)),
  );
}
