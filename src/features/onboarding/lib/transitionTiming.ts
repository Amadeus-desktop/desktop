export const ONBOARDING_PREPARE_DELAY_MS = 500;
export const ONBOARDING_COMPLETE_DELAY_MS = 350;

/** Logout overlay only — keep short so login step appears quickly. */
export const LOGOUT_PREPARE_DELAY_MS = 450;
export const LOGOUT_COMPLETE_DELAY_MS = 350;

export function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
