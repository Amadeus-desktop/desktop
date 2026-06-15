export type AuthProvider = "google";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  provider: AuthProvider;
  avatarUrl?: string;
};

export type AuthSnapshot = {
  user: AuthUser | null;
  hydrated: boolean;
  /** True while animating to onboarding UI before session teardown. */
  logoutTransitioning: boolean;
};
