export function isMainAuthCallbackOwnerSearch(search: string) {
  return new URLSearchParams(search).get("view") !== "companion";
}

export function isMainAuthCallbackOwner() {
  if (typeof window === "undefined") return false;
  return isMainAuthCallbackOwnerSearch(window.location.search);
}
