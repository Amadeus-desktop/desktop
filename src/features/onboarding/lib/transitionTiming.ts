export const ONBOARDING_PREPARE_DELAY_MS = 2000;
export const ONBOARDING_COMPLETE_DELAY_MS = 1400;

export function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
