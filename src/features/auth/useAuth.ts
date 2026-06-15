import { useSyncExternalStore } from "react";
import {
  getAuthSnapshot,
  hydrateAuth,
  signInWithGoogleMock,
  signOut,
  subscribeToAuth,
} from "./authStore";

export function useAuth() {
  const snapshot = useSyncExternalStore(
    subscribeToAuth,
    getAuthSnapshot,
    getAuthSnapshot,
  );

  return {
    user: snapshot.user,
    hydrated: snapshot.hydrated,
    isAuthenticated: snapshot.user !== null,
    hydrate: hydrateAuth,
    signInWithGoogle: signInWithGoogleMock,
    signOut,
  };
}
