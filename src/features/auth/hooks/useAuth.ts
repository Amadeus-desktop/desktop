import { useSyncExternalStore } from "react";
import {
  getAuthSnapshot,
  hydrateAuth,
  signInWithGoogleAuth,
  signOut,
  signOutWithTransition,
  subscribeToAuth,
} from "../store/authStore";

export function useAuth() {
  const snapshot = useSyncExternalStore(
    subscribeToAuth,
    getAuthSnapshot,
    getAuthSnapshot,
  );

  return {
    user: snapshot.user,
    hydrated: snapshot.hydrated,
    logoutTransitioning: snapshot.logoutTransitioning,
    logoutPhase: snapshot.logoutPhase,
    isAuthenticated: snapshot.user !== null,
    hydrate: hydrateAuth,
    signInWithGoogle: signInWithGoogleAuth,
    signOut,
    signOutWithTransition,
  };
}
