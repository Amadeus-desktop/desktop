import { patchAppSettings, useSettings } from "../settings/appSettingsStore";
import type { CharacterId } from "./types";

export function useCharacterSelection() {
  const { characterId } = useSettings();

  return {
    selectedCharacterId: characterId,
    selectCharacter: (id: CharacterId) => patchAppSettings({ characterId: id }),
  };
}
