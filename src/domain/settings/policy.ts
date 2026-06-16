import type { TalkFrequency } from "../../features/settings/types";

export type TalkFrequencyPolicy = {
  cooldownMinutes: number;
  pollIntervalMs: number;
  dailyUtteranceLimit: number;
  mockTriggerDelayMs: number;
};

const POLICY_BY_FREQUENCY: Record<TalkFrequency, TalkFrequencyPolicy> = {
  quiet: {
    cooldownMinutes: 45,
    pollIntervalMs: 120_000,
    dailyUtteranceLimit: 6,
    mockTriggerDelayMs: 1_800,
  },
  balanced: {
    cooldownMinutes: 30,
    pollIntervalMs: 60_000,
    dailyUtteranceLimit: 12,
    mockTriggerDelayMs: 900,
  },
  active: {
    cooldownMinutes: 15,
    pollIntervalMs: 20_000,
    dailyUtteranceLimit: 18,
    mockTriggerDelayMs: 450,
  },
  test: {
    cooldownMinutes: 1,
    pollIntervalMs: 5_000,
    dailyUtteranceLimit: 99,
    mockTriggerDelayMs: 150,
  },
};

export function getTalkFrequencyPolicy(
  talkFrequency: TalkFrequency,
): TalkFrequencyPolicy {
  return POLICY_BY_FREQUENCY[talkFrequency];
}

export function getPrivacyKeywords(
  privacyFilterEnabled: boolean,
  customPrivacyKeywords: string[],
): string[] {
  return privacyFilterEnabled ? customPrivacyKeywords : [];
}
