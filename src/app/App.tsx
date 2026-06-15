import { useEffect } from "react";
import { ControlCenter } from "../features/control-center";
import { ensureSettingsSync } from "../features/settings/appSettingsStore";

function App() {
  useEffect(() => {
    ensureSettingsSync();
  }, []);

  return (
    <main
      data-tauri-drag-region
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-transparent px-4 py-4 text-white"
    >
      <div className="relative z-10">
        <ControlCenter />
      </div>
    </main>
  );
}

export default App;
