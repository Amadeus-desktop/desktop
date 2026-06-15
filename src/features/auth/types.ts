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
  /** True while the logout transition UI is visible. */
  logoutTransitioning: boolean;
  logoutPhase: LogoutPhase | null;
};

export type LogoutPhase = "preparing" | "complete";
