import { useEffect, useState } from "react";

export function useCompanionDevTools() {
  const [devToolsOpen, setDevToolsOpen] = useState(false);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.metaKey && event.shiftKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        setDevToolsOpen((open) => !open);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return devToolsOpen;
}
