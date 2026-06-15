import { useEffect } from "react";
import { ControlCenter } from "../features/control-center";
import { useControlCenterWindow } from "../features/control-center/hooks/useControlCenterWindow";
import { ensureSettingsSync } from "../features/settings/appSettingsStore";

function App() {
  useControlCenterWindow();

  useEffect(() => {
    ensureSettingsSync();
  }, []);

  return (
    <main
      data-tauri-drag-region
      className="relative flex h-dvh w-dvw overflow-hidden bg-transparent p-3 text-white max-sm:p-2.5"
    >
      <div className="app-no-drag relative z-10 h-full min-h-0 w-full">
        <ControlCenter />
      </div>
    </main>
  );
}

export default App;
