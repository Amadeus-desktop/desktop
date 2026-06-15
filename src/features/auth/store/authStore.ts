import { createExternalStore } from "../../../lib/store/createExternalStore";
import { isTauriRuntime } from "../../../lib/tauri/runtime";
import { logger } from "../../../observability/logger";
import { resetCompanionSession } from "../../companion/lib/companionSessionStore";
import {
  getOnboardingSnapshot,
  hydrateOnboardingProgress,
  resetOnboardingProgress,
} from "../../onboarding";
import { animateMainWindowToControlCenter, animateMainWindowToOnboarding } from "../lib/mainWindowLayout";
import {
  AMADEUS_AUTH_CALLBACK_EVENT,
  completeSupabaseAuthCallback,
  extractAuthCallbackCode,
  getCurrentSupabaseUser,
  ensureDevAuthCallbackServer,
  signInWithGoogle,
  signOutSupabase,
} from "../adapters/supabaseAuth";
import type { AuthSnapshot, AuthUser, LogoutPhase } from "../types";

import {
  ONBOARDING_COMPLETE_DELAY_MS,
  ONBOARDING_PREPARE_DELAY_MS,
  sleep,
} from "../../onboarding/lib/transitionTiming";

const AUTH_STORAGE_KEY = "amadeus:auth-session";

const authStore = createExternalStore<AuthSnapshot>({
  user: null,
  hydrated: false,
  logoutTransitioning: false,
  logoutPhase: null,
});

let hydratePromise: Promise<AuthUser | null> | null = null;
let deepLinkAuthPromise: Promise<void> | null = null;
let deepLinkUnlisten: (() => void) | null = null;
let loopbackUnlisten: (() => void) | null = null;
const consumedAuthCodes = new Set<string>();

export function getAuthSnapshot() {
  return authStore.getSnapshot();
}

export function subscribeToAuth(listener: () => void) {
  return authStore.subscribe(listener);
}

function replaceSnapshot(
  user: AuthUser | null,
  hydrated = authStore.getSnapshot().hydrated,
  logoutTransitioning = authStore.getSnapshot().logoutTransitioning,
  logoutPhase = authStore.getSnapshot().logoutPhase,
) {
  authStore.setSnapshot({ user, hydrated, logoutTransitioning, logoutPhase });
}

function applyAuthenticatedUser(user: AuthUser) {
  writeStoredUser(user);
  replaceSnapshot(user, true);
  hydrateOnboardingProgress();
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
    startDeepLinkAuthListener();
    hydratePromise = ensureDevAuthCallbackServer()
      .then(() => getCurrentSupabaseUser())
      .then((supabaseUser) => {
        const user = supabaseUser ?? readStoredUser();
        replaceSnapshot(user, true);
        writeStoredUser(user);
        return user;
      });
  }

  return hydratePromise;
}

function bootstrapAuth() {
  const snapshot = authStore.getSnapshot();
  if (typeof window === "undefined" || snapshot.hydrated) return;
  startDeepLinkAuthListener();
  authStore.setSnapshot(
    {
      user: readStoredUser(),
      hydrated: true,
      logoutTransitioning: false,
      logoutPhase: null,
    },
    { notify: false },
  );
}

bootstrapAuth();

export async function signInWithGoogleAuth(): Promise<AuthUser | null> {
  startDeepLinkAuthListener();
  const user = await signInWithGoogle();
  if (!user) return null;

  applyAuthenticatedUser(user);
  if (getOnboardingSnapshot().progress.setupDone) {
    try {
      await animateMainWindowToControlCenter();
    } catch (error) {
      logger.error("auth", "login window transition failed", { error });
    }
  }
  return user;
}

function startDeepLinkAuthListener() {
  if (!isTauriRuntime() || deepLinkAuthPromise) return;

  deepLinkAuthPromise = import("@tauri-apps/plugin-deep-link")
    .then(async ({ getCurrent, onOpenUrl }) => {
      await startLoopbackAuthListener();
      const currentUrls = await getCurrent();
      await consumeAuthDeepLinks(currentUrls ?? []);
      deepLinkUnlisten = await onOpenUrl((urls) => {
        void consumeAuthDeepLinks(urls);
      });
    })
    .catch((error) => {
      logger.error("auth", "deep link auth listener failed", { error });
      deepLinkAuthPromise = null;
    });
}

async function startLoopbackAuthListener() {
  if (loopbackUnlisten) return;

  const { listen } = await import("@tauri-apps/api/event");
  loopbackUnlisten = await listen<{ url?: string }>(AMADEUS_AUTH_CALLBACK_EVENT, (event) => {
    const url = event.payload.url;
    if (typeof url !== "string") return;
    void consumeAuthDeepLinks([url]);
  });
}

async function consumeAuthDeepLinks(urls: string[]) {
  for (const url of urls) {
    const code = extractAuthCallbackCode(url);
    if (!code || consumedAuthCodes.has(code)) continue;
    consumedAuthCodes.add(code);

    try {
      const user = await completeSupabaseAuthCallback(url);
      if (!user) continue;
      applyAuthenticatedUser(user);
      if (getOnboardingSnapshot().progress.setupDone) {
        await animateMainWindowToControlCenter();
      }
      return;
    } catch (error) {
      logger.error("auth", "supabase auth callback failed", { error });
    }
  }
}

export function signOut() {
  deepLinkUnlisten?.();
  loopbackUnlisten?.();
  deepLinkUnlisten = null;
  loopbackUnlisten = null;
  deepLinkAuthPromise = null;
  consumedAuthCodes.clear();
  resetCompanionSession();
  writeStoredUser(null);
  authStore.setSnapshot({
    user: null,
    hydrated: true,
    logoutTransitioning: false,
    logoutPhase: null,
  });
}

function setLogoutPhase(phase: LogoutPhase) {
  const snapshot = authStore.getSnapshot();
  authStore.setSnapshot({
    ...snapshot,
    logoutTransitioning: true,
    logoutPhase: phase,
  });
}

export async function signOutWithTransition() {
  const snapshot = authStore.getSnapshot();
  if (snapshot.logoutTransitioning) return;

  setLogoutPhase("preparing");
  resetOnboardingProgress();

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });

  try {
    await sleep(ONBOARDING_PREPARE_DELAY_MS);
    setLogoutPhase("complete");
    await sleep(ONBOARDING_COMPLETE_DELAY_MS);

    try {
      await animateMainWindowToOnboarding();
    } catch (error) {
      logger.error("auth", "logout window transition failed", { error });
    }

    try {
      await signOutSupabase();
    } catch (error) {
      logger.error("auth", "supabase sign out failed", { error });
    }
  } finally {
    signOut();
  }
}
