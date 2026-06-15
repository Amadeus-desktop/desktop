import type { AuthMessages } from "../modules/auth";

export const auth: AuthMessages = {
  onboarding: {
    headline: "Your quiet companion for the day",
    subheadline:
      "Amadeus stays nearby — gentle nudges, soft check-ins, and a calmer way to look back at your work.",
    body: "Sign in with Google to sync your preferences and keep your companion with you across devices.",
    googleButton: "Continue with Google",
    footnote:
      "By continuing, you agree to our Terms of Service and Privacy Policy.",
  },
  account: {
    section: "Account",
    signedInAs: "Signed in with Google",
    logout: "Log out",
    loggingOut: "Signing out…",
  },
};
