import { CompanionShell } from "../features/companion/CompanionShell";
import { ControlCenter } from "../features/control-center/ControlCenter";
import "./App.css";

function App() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-transparent px-4 py-4 text-white">
      <div className="relative z-10">
        <ControlCenter />
      </div>
      <CompanionShell />
    </main>
  );
}

export default App;
