import { createExternalStore } from "../../lib/createExternalStore";
import type { OnboardingProgress } from "./types";

const ONBOARDING_PROGRESS_KEY = "amadeus:onboarding-progress";
const ONBOARDING_STORAGE_VERSION = 3;

type StoredOnboardingProgress = OnboardingProgress & {
  version?: number;
};

type OnboardingStoreSnapshot = {
  progress: OnboardingProgress;
  hydrated: boolean;
};

const emptyProgress: OnboardingProgress = {
  permissionsDone: false,
  setupDone: false,
};

const onboardingStore = createExternalStore<OnboardingStoreSnapshot>({
  progress: { ...emptyProgress },
  hydrated: false,
});

function replaceSnapshot(progress: OnboardingProgress) {
  onboardingStore.setSnapshot({
    progress,
    hydrated: onboardingStore.getSnapshot().hydrated,
  });
}

function normalizeStoredProgress(raw: unknown): OnboardingProgress {
  if (!raw || typeof raw !== "object") {
    return { ...emptyProgress };
  }

  const parsed = raw as Record<string, unknown>;

  if (parsed.version === ONBOARDING_STORAGE_VERSION) {
    return {
      permissionsDone: parsed.permissionsDone === true,
      setupDone: parsed.setupDone === true,
    };
  }

  const permissionsDone =
    parsed.permissionsDone === true ||
    parsed.permissionsResolved === true ||
    parsed.setupDone === true;

  return {
    permissionsDone,
    setupDone: false,
  };
}

function readStoredProgress(): OnboardingProgress {
  if (typeof window === "undefined") {
    return { ...emptyProgress };
  }

  try {
    const raw = localStorage.getItem(ONBOARDING_PROGRESS_KEY);
    if (!raw) return { ...emptyProgress };
    return normalizeStoredProgress(JSON.parse(raw));
  } catch {
    return { ...emptyProgress };
  }
}

function writeStoredProgress(progress: OnboardingProgress) {
  if (typeof window === "undefined") return;

  const payload: StoredOnboardingProgress = {
    ...progress,
    version: ONBOARDING_STORAGE_VERSION,
  };
  localStorage.setItem(ONBOARDING_PROGRESS_KEY, JSON.stringify(payload));
}

export function getOnboardingSnapshot() {
  return onboardingStore.getSnapshot();
}

export function hydrateOnboardingProgress() {
  const snapshot = onboardingStore.getSnapshot();
  if (snapshot.hydrated) return snapshot.progress;

  const stored = readStoredProgress();
  onboardingStore.setSnapshot({ progress: stored, hydrated: true });
  return stored;
}

export function subscribeToOnboarding(listener: () => void) {
  return onboardingStore.subscribe(listener);
}

export function markPermissionsDone() {
  const { progress } = onboardingStore.getSnapshot();
  const next: OnboardingProgress = {
    permissionsDone: true,
    setupDone: progress.setupDone,
  };
  writeStoredProgress(next);
  replaceSnapshot(next);
}

export function markSetupDone() {
  const next: OnboardingProgress = {
    permissionsDone: true,
    setupDone: true,
  };
  writeStoredProgress(next);
  replaceSnapshot(next);
}

export function resetOnboardingProgress() {
  writeStoredProgress({ ...emptyProgress });
  replaceSnapshot({ ...emptyProgress });
}

function bootstrapOnboardingProgress() {
  const snapshot = onboardingStore.getSnapshot();
  if (typeof window === "undefined" || snapshot.hydrated) return;
  onboardingStore.setSnapshot(
    { progress: readStoredProgress(), hydrated: true },
    { notify: false },
  );
}

bootstrapOnboardingProgress();
