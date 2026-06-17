import type { Persona } from "../../../domain/persona/types";
import type { MemoryCard } from "../../../domain/memory/cards";
import type { PromptCurrentContext } from "../../../domain/prompt/assembly";
import { generateChatReply } from "../../llm";
import { listCloudSafeMemoryCards } from "../../memory";
import type { GeneralSettings } from "../../settings/types";
import { listLocalMemoryCards } from "../../timeline/adapters/timelineRepository";
import type { CompanionMessage } from "../types";
import type { LlmGeneration } from "../../llm/types";

type ReplyDependencies = {
  listCloudSafeMemoryCards: typeof listCloudSafeMemoryCards;
  listLocalMemoryCards?: (input: {
    personaId: Persona["id"];
    limit?: number;
  }) => Promise<MemoryCard[]>;
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
    listLocalMemoryCards,
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
  const memoryCards = await loadMemoriesForAppReply(persona.id, dependencies);

  return dependencies.generateChatReply(messages, persona, settings, {
    mode: "deep",
    memoryCards,
    currentContext: dependencies.currentContext ?? null,
  });
}

async function loadMemoriesForAppReply(
  personaId: Persona["id"],
  dependencies: ReplyDependencies,
): Promise<MemoryCard[]> {
  const [cloudSafe, local] = await Promise.all([
    loadCloudSafeMemoriesForReply(personaId, dependencies.listCloudSafeMemoryCards),
    loadLocalMemoriesForReply(personaId, dependencies.listLocalMemoryCards),
  ]);
  return [...cloudSafe, ...local];
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

async function loadLocalMemoriesForReply(
  personaId: Persona["id"],
  load: ReplyDependencies["listLocalMemoryCards"],
): Promise<MemoryCard[]> {
  if (!load) return [];
  try {
    return await load({
      personaId,
      limit: 7,
    });
  } catch (error) {
    console.warn("local_memory_load_failed", {
      errorType: error instanceof Error ? error.name : typeof error,
    });
    return [];
  }
}
