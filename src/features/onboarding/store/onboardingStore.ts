import {
  emptyOnboardingProgress,
  normalizeStoredOnboardingProgress,
  ONBOARDING_STORAGE_VERSION,
  type OnboardingProgress,
} from "../../../domain/onboarding";
import { createExternalStore } from "../../../lib/store/createExternalStore";

const ONBOARDING_PROGRESS_KEY = "amadeus:onboarding-progress";

type StoredOnboardingProgress = OnboardingProgress & {
  version?: number;
};

type OnboardingStoreSnapshot = {
  progress: OnboardingProgress;
  hydrated: boolean;
};

const onboardingStore = createExternalStore<OnboardingStoreSnapshot>({
  progress: emptyOnboardingProgress(),
  hydrated: false,
});

function replaceSnapshot(progress: OnboardingProgress) {
  onboardingStore.setSnapshot({
    progress,
    hydrated: onboardingStore.getSnapshot().hydrated,
  });
}

function readStoredProgress(): OnboardingProgress {
  if (typeof window === "undefined") {
    return emptyOnboardingProgress();
  }

  try {
    const raw = localStorage.getItem(ONBOARDING_PROGRESS_KEY);
    if (!raw) return emptyOnboardingProgress();
    return normalizeStoredOnboardingProgress(JSON.parse(raw));
  } catch {
    return emptyOnboardingProgress();
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
    modelRouteDone: progress.modelRouteDone,
    setupDone: progress.setupDone,
  };
  writeStoredProgress(next);
  replaceSnapshot(next);
}

export function markModelRouteDone() {
  const next: OnboardingProgress = {
    permissionsDone: true,
    modelRouteDone: true,
    setupDone: false,
  };
  writeStoredProgress(next);
  replaceSnapshot(next);
}

export function markSetupDone() {
  const next: OnboardingProgress = {
    permissionsDone: true,
    modelRouteDone: true,
    setupDone: true,
  };
  writeStoredProgress(next);
  replaceSnapshot(next);
}

export function resetOnboardingProgress() {
  const empty = emptyOnboardingProgress();
  writeStoredProgress(empty);
  replaceSnapshot(empty);
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
