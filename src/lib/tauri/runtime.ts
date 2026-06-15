export function isTauriRuntime() {
  return (
    typeof window !== "undefined" &&
    "__TAURI_INTERNALS__" in
      (window as unknown as { __TAURI_INTERNALS__?: unknown })
  );
}
