import { createExternalStore } from "../../../lib/store/createExternalStore";
import { isTauriRuntime } from "../../../lib/tauri/runtime";
import { logger } from "../../../observability/logger";
import { resetCompanionSession } from "../../companion/lib/companionSessionStore";
import {
  getOnboardingSnapshot,
  hydrateOnboardingProgress,
  resetOnboardingProgress,
} from "../../onboarding";
import { requestMainWindowLayout } from "../../lifecycle";
import { MAIN_WINDOW_ANIMATION_DURATION_MS } from "../lib/mainWindowLayout";
import {
  AMADEUS_AUTH_CALLBACK_EVENT,
  consumePendingAuthCallback,
  completeSupabaseAuthCallback,
  extractAuthCallbackCode,
  getCurrentSupabaseUser,
  ensureDevAuthCallbackServer,
  signInWithGoogle,
  signOutSupabase,
} from "../adapters/supabaseAuth";
import { isMainAuthCallbackOwner } from "../lib/authCallbackOwnership";
import type { AuthSnapshot, AuthUser, LogoutPhase } from "../types";

import {
  LOGOUT_COMPLETE_DELAY_MS,
  LOGOUT_PREPARE_DELAY_MS,
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
const authCodesInFlight = new Set<string>();

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
    replaceSnapshot(parseStoredUser(event.newValue), false);
    hydratePromise = null;
    void hydrateAuth();
  });
}

export function hydrateAuth() {
  const snapshot = authStore.getSnapshot();
  if (snapshot.hydrated) {
    logger.info("auth", "hydrateAuth skipped because auth store is already hydrated", {
      hasUser: Boolean(snapshot.user),
    });
    return Promise.resolve(snapshot.user);
  }

  if (!hydratePromise) {
    logger.info("auth", "hydrateAuth started");
    const ownsAuthCallbacks = isMainAuthCallbackOwner();
    if (ownsAuthCallbacks) {
      startDeepLinkAuthListener();
    }
    hydratePromise = (ownsAuthCallbacks ? ensureDevAuthCallbackServer() : Promise.resolve())
      .then(() => getCurrentSupabaseUser())
      .then((supabaseUser) => {
        const user = supabaseUser;
        replaceSnapshot(user, true);
        writeStoredUser(user);
        logger.info("auth", "hydrateAuth completed", {
          source: supabaseUser ? "supabase" : "empty",
          hasUser: Boolean(user),
        });
        return user;
      })
      .catch((error) => {
        logger.error("auth", "hydrateAuth failed", { error });
        throw error;
      });
  }

  return hydratePromise;
}

function bootstrapAuth() {
  const snapshot = authStore.getSnapshot();
  if (typeof window === "undefined" || snapshot.hydrated) return;
  if (isMainAuthCallbackOwner()) {
    startDeepLinkAuthListener();
  }
  const storedUser = readStoredUser();
  authStore.setSnapshot(
    {
      user: storedUser,
      hydrated: false,
      logoutTransitioning: false,
      logoutPhase: null,
    },
    { notify: false },
  );
  logger.info("auth", "bootstrapAuth applied local mirror snapshot", {
    hasUser: Boolean(storedUser),
  });
}

bootstrapAuth();

export async function signInWithGoogleAuth(): Promise<AuthUser | null> {
  if (isMainAuthCallbackOwner()) {
    startDeepLinkAuthListener();
    await ensureDevAuthCallbackServer();
  }
  const user = await signInWithGoogle();
  if (!user) return null;

  applyAuthenticatedUser(user);
  if (getOnboardingSnapshot().progress.setupDone) {
    try {
      await requestMainWindowLayout({
        mode: "control-center",
        reason: "login-complete",
        priority: 30,
      });
    } catch (error) {
      logger.error("auth", "login window transition failed", { error });
    }
  }
  return user;
}

function startDeepLinkAuthListener() {
  if (!isTauriRuntime() || deepLinkAuthPromise) return;

  logger.info("auth", "deep link auth listener setup started");
  deepLinkAuthPromise = import("@tauri-apps/plugin-deep-link")
    .then(async ({ getCurrent, onOpenUrl }) => {
      await startLoopbackAuthListener();
      const pendingUrl = await consumePendingAuthCallback();
      if (pendingUrl) {
        logger.info("auth", "pending auth callback replay consumed");
        await consumeAuthDeepLinks([pendingUrl]);
      }
      const currentUrls = await getCurrent();
      logger.info("auth", "deep link current urls loaded", {
        count: currentUrls?.length ?? 0,
      });
      await consumeAuthDeepLinks(currentUrls ?? []);
      deepLinkUnlisten = await onOpenUrl((urls) => {
        logger.info("auth", "deep link open urls received", {
          count: urls.length,
        });
        void consumeAuthDeepLinks(urls);
      });
      logger.info("auth", "deep link auth listener setup completed");
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
    logger.info("auth", "loopback auth callback event received");
    void consumeAuthDeepLinks([url]);
  });
  logger.info("auth", "loopback auth callback listener ready");
}

async function consumeAuthDeepLinks(urls: string[]) {
  for (const url of urls) {
    const code = extractAuthCallbackCode(url);
    if (!code) {
      logger.warn("auth", "ignored unsupported auth callback url");
      continue;
    }
    if (consumedAuthCodes.has(code)) {
      logger.warn("auth", "ignored duplicate auth callback code");
      continue;
    }
    if (authCodesInFlight.has(code)) {
      logger.warn("auth", "ignored in-flight auth callback code");
      continue;
    }
    authCodesInFlight.add(code);

    try {
      logger.info("auth", "supabase auth callback exchange started");
      const user = await completeSupabaseAuthCallback(url);
      if (!user) continue;
      consumedAuthCodes.add(code);
      applyAuthenticatedUser(user);
      logger.info("auth", "supabase auth callback exchange completed", {
        hasUser: true,
      });
      if (getOnboardingSnapshot().progress.setupDone) {
        await requestMainWindowLayout({
          mode: "control-center",
          reason: "auth-callback",
          priority: 30,
        });
      }
      return;
    } catch (error) {
      logger.error("auth", "supabase auth callback failed", { error });
    } finally {
      authCodesInFlight.delete(code);
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
  authCodesInFlight.clear();
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
    try {
      await requestMainWindowLayout({
        mode: "onboarding",
        reason: "logout",
        animated: true,
        durationMs: MAIN_WINDOW_ANIMATION_DURATION_MS,
        priority: 40,
      });
    } catch (error) {
      logger.error("auth", "logout window transition failed", { error });
      try {
        await requestMainWindowLayout({
          mode: "onboarding",
          reason: "logout",
          priority: 40,
        });
      } catch (fallbackError) {
        logger.error("auth", "logout window layout fallback failed", {
          error: fallbackError,
        });
      }
    }

    await sleep(LOGOUT_PREPARE_DELAY_MS);
    setLogoutPhase("complete");
    await sleep(LOGOUT_COMPLETE_DELAY_MS);

    try {
      await signOutSupabase();
    } catch (error) {
      logger.error("auth", "supabase sign out failed", { error });
    }
  } finally {
    signOut();
  }
}
