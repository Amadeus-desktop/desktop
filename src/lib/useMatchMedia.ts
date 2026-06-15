import { useSyncExternalStore } from "react";

function subscribeMediaQuery(query: string, listener: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

function getMediaQuerySnapshot(query: string) {
  return window.matchMedia(query).matches;
}

export function useMatchMedia(query: string) {
  return useSyncExternalStore(
    (listener) => subscribeMediaQuery(query, listener),
    () => getMediaQuerySnapshot(query),
    () => false,
  );
}
