import type { CompanionMode } from "../types";

let activeLayoutMode: CompanionMode = "quiet";

export function setCompanionLayoutMode(mode: CompanionMode) {
  activeLayoutMode = mode;
}

export function getCompanionLayoutMode(): CompanionMode {
  return activeLayoutMode;
}
