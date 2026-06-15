import type { AuthSnapshot, AuthUser } from "./types";

const AUTH_STORAGE_KEY = "amadeus:auth-session";

let snapshot: AuthSnapshot = {
  user: null,
  hydrated: false,
};

const listeners = new Set<() => void>();
let hydratePromise: Promise<AuthUser | null> | null = null;

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribeAuth(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAuthSnapshot() {
  return snapshot;
}

function readStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;

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

function writeStoredUser(user: AuthUser | null) {
  if (typeof window === "undefined") return;

  if (user) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

function replaceSnapshot(user: AuthUser | null, hydrated = snapshot.hydrated) {
  snapshot = { user, hydrated };
  notify();
}

export function hydrateAuth() {
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

export function useAuthStore(): AuthSnapshot {
  return snapshot;
}

export function subscribeToAuth(listener: () => void) {
  return subscribeAuth(listener);
}

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
  return user;
}

export function signOut() {
  writeStoredUser(null);
  replaceSnapshot(null, true);
}
