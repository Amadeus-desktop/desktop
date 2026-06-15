/**
 * Minimal external store for useSyncExternalStore.
 * getSnapshot must return the same object reference until setSnapshot replaces it.
 */
export type ExternalStore<TSnapshot> = {
  getSnapshot: () => TSnapshot;
  subscribe: (listener: () => void) => () => void;
  setSnapshot: (next: TSnapshot, options?: { notify?: boolean }) => void;
};

export function createExternalStore<TSnapshot>(
  initialSnapshot: TSnapshot,
): ExternalStore<TSnapshot> {
  let snapshot = initialSnapshot;
  const listeners = new Set<() => void>();

  function notify() {
    listeners.forEach((listener) => listener());
  }

  return {
    getSnapshot() {
      return snapshot;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setSnapshot(next, options = { notify: true }) {
      snapshot = next;
      if (options.notify !== false) {
        notify();
      }
    },
  };
}
