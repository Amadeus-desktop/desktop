import { useState } from "react";
import type { CharacterId } from "./types";

export function useCharacterSelection() {
  const [selectedCharacterId, setSelectedCharacterId] =
    useState<CharacterId>("emilia");

  return {
    selectedCharacterId,
    selectCharacter: setSelectedCharacterId,
  };
}
