import { useAuth } from "../../auth";
import { useOnboarding } from "../../onboarding";

export function useCompanionPresentationEnabled() {
  const { isAuthenticated } = useAuth();
  const { isComplete, hydrated } = useOnboarding(isAuthenticated);

  return hydrated && isAuthenticated && isComplete;
}
