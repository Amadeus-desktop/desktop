import { invoke } from "@tauri-apps/api/core";
import { getPrivacyKeywords } from "../../domain/settings";
import {
  pollMockTriggerEngine,
  recordMockTriggerReactionForScoring,
  runMockTriggerEngineOnce,
} from "../../mocks/trigger";
import { isTauriRuntime } from "../../lib/tauriRuntime";
import { getAppSettingsSnapshot } from "../settings/appSettingsStore";
import type {
  TriggerPollResult,
  TriggerRunResult,
  TriggerRuntimeSnapshot,
} from "./types";

function readTriggerSettings() {
  const { settings } = getAppSettingsSnapshot();

  return {
    keywords: getPrivacyKeywords(
      settings.privacyFilterEnabled,
      settings.customPrivacyKeywords,
    ),
  };
}

export async function runTriggerEngineOnce(
  keywords: string[] = readTriggerSettings().keywords,
): Promise<TriggerRunResult> {
  if (isTauriRuntime()) {
    return invoke<TriggerRunResult>("run_trigger_engine_once", { keywords });
  }

  return runMockTriggerEngineOnce(keywords);
}

export async function pollTriggerEngine(
  keywords: string[] = readTriggerSettings().keywords,
): Promise<TriggerPollResult> {
  if (isTauriRuntime()) {
    return invoke<TriggerPollResult>("poll_trigger_engine", { keywords });
  }

  return pollMockTriggerEngine(keywords);
}

export async function recordTriggerReactionForScoring(
  reactionType: string,
): Promise<TriggerRuntimeSnapshot> {
  if (isTauriRuntime()) {
    return invoke<TriggerRuntimeSnapshot>(
      "record_trigger_reaction_for_scoring",
      { reactionType },
    );
  }

  return recordMockTriggerReactionForScoring(reactionType);
}
