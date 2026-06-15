import { useEffect } from "react";
import { cn } from "../lib/cn";
import { ControlCenter } from "../features/control-center";
import { useControlCenterWindow } from "../features/control-center/hooks/useControlCenterWindow";
import {
  hydrateAuth,
  OnboardingScreen,
  useAuth,
  useAuthWindow,
} from "../features/auth";
import { ensureSettingsSync } from "../features/settings/appSettingsStore";
import { useShellTheme } from "../ui/theme/useShellTheme";

function App() {
  const { hydrated, isAuthenticated, signInWithGoogle } = useAuth();
  useShellTheme();
  useAuthWindow(isAuthenticated, hydrated);
  useControlCenterWindow(isAuthenticated);

  useEffect(() => {
    void hydrateAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      ensureSettingsSync();
    }
  }, [isAuthenticated]);

  return (
    <main
      data-tauri-drag-region
      className={cn(
        "relative flex h-dvh w-dvw overflow-hidden bg-transparent text-white",
        isAuthenticated ? "p-3 max-sm:p-2.5" : "p-1.5",
      )}
    >
      <div className="app-no-drag relative z-10 h-full min-h-0 w-full">
        {!hydrated ? null : isAuthenticated ? (
          <ControlCenter />
        ) : (
          <OnboardingScreen onGoogleSignIn={signInWithGoogle} />
        )}
      </div>
    </main>
  );
}

export default App;
