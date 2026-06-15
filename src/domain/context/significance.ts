import type { MacosContextSnapshot } from "../../features/context/types";
import { CONTEXT_IDLE_THRESHOLD_SECONDS } from "./constants";

export function hasSignificantContextChange(
  previous: MacosContextSnapshot | null,
  next: MacosContextSnapshot,
): boolean {
  if (!previous) {
    return true;
  }

  if (previous.appName !== next.appName) return true;
  if (previous.bundleIdentifier !== next.bundleIdentifier) return true;
  if (previous.windowTitle !== next.windowTitle) return true;
  if (previous.category !== next.category) return true;

  const previousIdle = previous.idleSeconds >= CONTEXT_IDLE_THRESHOLD_SECONDS;
  const nextIdle = next.idleSeconds >= CONTEXT_IDLE_THRESHOLD_SECONDS;
  if (previousIdle !== nextIdle) return true;

  return false;
}

export function parsePrivacyKeywordsInput(value: string): string[] {
  return value
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

export function formatPrivacyKeywordsInput(keywords: string[]): string {
  return keywords.join(", ");
}
