import { useEffect } from "react";
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
      className="relative flex h-dvh w-dvw overflow-hidden bg-transparent p-3 text-white max-sm:p-2.5"
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
