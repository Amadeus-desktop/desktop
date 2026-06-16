import { patchAppSettings, useSettings } from "../../settings";
import type { CharacterId } from "../types";

export function useCharacterSelection() {
  const { characterId } = useSettings();

  return {
    selectedCharacterId: characterId,
    selectCharacter: (id: CharacterId) =>
      patchAppSettings({ characterId: id, companionPersonaId: id }),
  };
}
