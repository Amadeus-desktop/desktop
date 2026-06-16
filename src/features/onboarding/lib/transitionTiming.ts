export const ONBOARDING_PREPARE_DELAY_MS = 500;
export const ONBOARDING_COMPLETE_DELAY_MS = 350;

/**
 * Logout overlay timing. The onboarding background cross-fades in first, then
 * the window resizes (≈animation duration), then we settle, then advance the
 * steps. PREPARE is small because the resize + settle already play under the
 * "나가는 중이에요" step.
 */
export const LOGOUT_SETTLE_DELAY_MS = 500;
export const LOGOUT_PREPARE_DELAY_MS = 300;
export const LOGOUT_COMPLETE_DELAY_MS = 700;

export function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
