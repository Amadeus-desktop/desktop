import type { Persona } from "../types";
import type { CompanionMessage } from "../types";
import { generatePocketIntro } from "./pocketIntro";

type BuildPocketOpeningMessagesInput = {
  nudge: string;
  persona: Persona;
  openingId: string;
  restoredMessages: CompanionMessage[];
};

export function buildPocketOpeningMessages({
  nudge,
  persona,
  openingId,
  restoredMessages,
}: BuildPocketOpeningMessagesInput): CompanionMessage[] {
  const intro = generatePocketIntro(nudge, persona);
  const openingMessage: CompanionMessage = {
    id: openingId,
    sender: "companion",
    text: intro,
  };

  return [openingMessage, ...restoredMessages];
}
