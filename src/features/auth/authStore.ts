import { createExternalStore } from "../../lib/createExternalStore";
import { logger } from "../../observability/logger";
import { getOnboardingSnapshot, hydrateOnboardingProgress } from "../onboarding/onboardingStore";
import { animateMainWindowToControlCenter, animateMainWindowToOnboarding } from "./mainWindowLayout";
import type { AuthSnapshot, AuthUser } from "./types";

const AUTH_STORAGE_KEY = "amadeus:auth-session";

const authStore = createExternalStore<AuthSnapshot>({
  user: null,
  hydrated: false,
});

let hydratePromise: Promise<AuthUser | null> | null = null;

export function getAuthSnapshot() {
  return authStore.getSnapshot();
}

export function subscribeToAuth(listener: () => void) {
  return authStore.subscribe(listener);
}

function replaceSnapshot(user: AuthUser | null, hydrated = authStore.getSnapshot().hydrated) {
  authStore.setSnapshot({ user, hydrated });
}

function readStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  return parseStoredUser(localStorage.getItem(AUTH_STORAGE_KEY));
}

function writeStoredUser(user: AuthUser | null) {
  if (typeof window === "undefined") return;

  if (user) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

function parseStoredUser(raw: string | null): AuthUser | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AuthUser;
    if (
      typeof parsed.id !== "string" ||
      typeof parsed.email !== "string" ||
      typeof parsed.name !== "string" ||
      parsed.provider !== "google"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== AUTH_STORAGE_KEY) return;
    replaceSnapshot(parseStoredUser(event.newValue), true);
  });
}

export function hydrateAuth() {
  const snapshot = authStore.getSnapshot();
  if (snapshot.hydrated) {
    return Promise.resolve(snapshot.user);
  }

  if (!hydratePromise) {
    hydratePromise = Promise.resolve().then(() => {
      const user = readStoredUser();
      replaceSnapshot(user, true);
      return user;
    });
  }

  return hydratePromise;
}

function bootstrapAuth() {
  const snapshot = authStore.getSnapshot();
  if (typeof window === "undefined" || snapshot.hydrated) return;
  authStore.setSnapshot({ user: readStoredUser(), hydrated: true }, { notify: false });
}

bootstrapAuth();

export async function signInWithGoogleMock(): Promise<AuthUser> {
  await new Promise((resolve) => setTimeout(resolve, 650));

  const user: AuthUser = {
    id: "google-mock-user",
    email: "you@gmail.com",
    name: "Amadeus User",
    provider: "google",
  };

  writeStoredUser(user);
  replaceSnapshot(user, true);
  hydrateOnboardingProgress();
  if (getOnboardingSnapshot().progress.setupDone) {
    try {
      await animateMainWindowToControlCenter();
    } catch (error) {
      logger.error("auth", "login window transition failed", { error });
    }
  }
  return user;
}

export function signOut() {
  writeStoredUser(null);
  replaceSnapshot(null, true);
}

export async function signOutWithTransition() {
  try {
    await animateMainWindowToOnboarding();
  } catch (error) {
    logger.error("auth", "logout window transition failed", { error });
  } finally {
    signOut();
  }
}
