import type { Persona } from "../../../domain/persona/types";
import type { MemoryCard } from "../../../domain/memory/cards";
import type { PromptCurrentContext } from "../../../domain/prompt/assembly";
import { generateChatReply } from "../../llm";
import { listCloudSafeMemoryCards } from "../../memory";
import type { GeneralSettings } from "../../settings/types";
import type { CompanionMessage } from "../types";
import type { LlmGeneration } from "../../llm/types";

type ReplyDependencies = {
  listCloudSafeMemoryCards: typeof listCloudSafeMemoryCards;
  generateChatReply: typeof generateChatReply;
};

export async function resolveCompanionReply(
  messages: CompanionMessage[],
  persona: Persona,
  settings: GeneralSettings,
  options: {
    currentContext?: PromptCurrentContext | null;
  } = {},
): Promise<LlmGeneration> {
  return resolveCompanionReplyWithDependencies(messages, persona, settings, {
    listCloudSafeMemoryCards,
    generateChatReply,
    currentContext: options.currentContext,
  });
}

export async function resolveCompanionReplyWithDependencies(
  messages: CompanionMessage[],
  persona: Persona,
  settings: GeneralSettings,
  dependencies: ReplyDependencies & {
    currentContext?: PromptCurrentContext | null;
  },
): Promise<LlmGeneration> {
  const memoryCards = await loadCloudSafeMemoriesForReply(
    persona.id,
    dependencies.listCloudSafeMemoryCards,
  );

  return dependencies.generateChatReply(messages, persona, settings, {
    mode: "deep",
    memoryCards,
    currentContext: dependencies.currentContext ?? null,
  });
}

async function loadCloudSafeMemoriesForReply(
  personaId: Persona["id"],
  load: ReplyDependencies["listCloudSafeMemoryCards"],
): Promise<MemoryCard[]> {
  try {
    return await load({
      personaId,
      limit: 7,
    });
  } catch (error) {
    console.warn("cloud_memory_load_failed", {
      errorType: error instanceof Error ? error.name : typeof error,
    });
    return [];
  }
}
