import type { Persona } from "../../../domain/persona/types";
import { generateChatReply } from "../../llm";
import type { GeneralSettings } from "../../settings/types";
import type { CompanionMessage } from "../types";
import type { LlmGeneration } from "../../llm/types";

export async function resolveCompanionReply(
  messages: CompanionMessage[],
  persona: Persona,
  settings: GeneralSettings,
): Promise<LlmGeneration> {
  return generateChatReply(messages, persona, settings);
}
