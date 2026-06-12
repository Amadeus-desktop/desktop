import { CompanionShell } from "../features/companion/CompanionShell";
import { ControlCenter } from "../features/control-center/ControlCenter";
import "./App.css";

function App() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#101114] px-4 py-4 text-white">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#313947_0%,#121418_46%,#2a2030_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_45%,rgba(0,0,0,0.28)_100%)]" />
      <div className="relative z-10">
        <ControlCenter />
      </div>
      <CompanionShell />
    </main>
  );
}

export default App;
