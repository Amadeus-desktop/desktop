import "./App.css";

function App() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f5ef] px-6 text-[#17201a]">
      <section className="w-full max-w-[420px]">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#d8d0c1] bg-white/70 px-3 py-1 text-xs font-medium text-[#5d675f] shadow-sm">
          <span className="size-2 rounded-full bg-[#6f9f75]" />
          macOS companion foundation
        </div>

        <div className="rounded-lg border border-[#d8d0c1] bg-white/85 p-6 shadow-sm">
          <p className="mb-3 text-sm font-medium text-[#6f9f75]">Amadeus</p>
          <h1 className="text-2xl font-semibold leading-tight">
            조용히 곁에 있는 데스크톱 동반자
          </h1>
          <p className="mt-4 text-sm leading-6 text-[#5d675f]">
            Tauri, React, Vite, Tailwind CSS v4 기반이 준비되었습니다.
          </p>
        </div>
      </section>
    </main>
  );
}

export default App;

