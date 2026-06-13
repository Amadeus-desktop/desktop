import { getCurrentWindow } from "@tauri-apps/api/window";

export function WindowControls() {
  const handleClose = () => {
    void getCurrentWindow().close();
  };

  const handleMinimize = () => {
    void getCurrentWindow().minimize();
  };

  const handleMaximize = async () => {
    try {
      const w = getCurrentWindow();
      if (await w.isMaximized()) {
        await w.unmaximize();
      } else {
        await w.maximize();
      }
    } catch (err) {
      console.error("Failed to toggle maximize:", err);
    }
  };

  return (
    <div className="mb-6 ml-2.5 flex gap-2">
      <button
        type="button"
        onClick={handleClose}
        className="size-3 rounded-full bg-[#ff5f56] hover:opacity-80 transition cursor-default"
        aria-label="Close window"
      />
      <button
        type="button"
        onClick={handleMinimize}
        className="size-3 rounded-full bg-[#ffbd2e] hover:opacity-80 transition cursor-default"
        aria-label="Minimize window"
      />
      <button
        type="button"
        onClick={handleMaximize}
        className="size-3 rounded-full bg-[#27c93f] hover:opacity-80 transition cursor-default"
        aria-label="Maximize window"
      />
    </div>
  );
}

