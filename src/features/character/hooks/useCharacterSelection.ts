import { useState } from "react";
import type { CharacterId } from "../model/types";

export function useCharacterSelection() {
  const [selectedCharacterId, setSelectedCharacterId] =
    useState<CharacterId>("emilia");

  return {
    selectedCharacterId,
    selectCharacter: setSelectedCharacterId,
  };
}

