import {
  rankPromptMemoryCards,
  type MemoryCard,
  type MemoryProvider,
} from "../../../domain/memory/cards";
import type { PromptMode } from "../../../domain/prompt/assembly";
import {
  listLocalMemoryCards as defaultListLocalMemoryCards,
} from "../../timeline/adapters/timelineRepository";
import { listCloudSafeMemoryCards as defaultListCloudSafeMemoryCards } from "./supabaseCloudMemoryRepository";

type RagMemorySourceDependencies = {
  listLocalMemoryCards: (input: {
    personaId: string;
    limit?: number;
  }) => Promise<MemoryCard[]>;
  listCloudSafeMemoryCards: (input: {
    personaId: string;
    limit?: number;
  }) => Promise<MemoryCard[]>;
};

export type AppPromptMemorySelectionInput = {
  personaId: string;
  mode: PromptMode;
  provider: MemoryProvider;
  online: boolean;
  nowMs?: number;
  limit?: number;
};

export type WebPromptMemorySelectionInput = {
  personaId: string;
  mode: PromptMode;
  nowMs?: number;
  limit?: number;
};

const defaultDependencies: RagMemorySourceDependencies = {
  listLocalMemoryCards: defaultListLocalMemoryCards,
  listCloudSafeMemoryCards: defaultListCloudSafeMemoryCards,
};

export async function selectAppPromptMemoryCards(
  input: AppPromptMemorySelectionInput,
  dependencies: RagMemorySourceDependencies = defaultDependencies,
): Promise<MemoryCard[]> {
  const localCards = await dependencies.listLocalMemoryCards({
    personaId: input.personaId,
    limit: input.limit ?? 12,
  });
  const cloudCards = input.online
    ? await dependencies
        .listCloudSafeMemoryCards({
          personaId: input.personaId,
          limit: input.limit ?? 12,
        })
        .catch(() => [])
    : [];

  return rankPromptMemoryCards(dedupeMemoryCards([...localCards, ...cloudCards]), {
    nowMs: input.nowMs ?? Date.now(),
    personaId: input.personaId,
    mode: input.mode,
    provider: input.provider,
  });
}

export async function selectWebPromptMemoryCards(
  input: WebPromptMemorySelectionInput,
  dependencies: Pick<RagMemorySourceDependencies, "listCloudSafeMemoryCards"> =
    defaultDependencies,
): Promise<MemoryCard[]> {
  const cloudCards = await dependencies
    .listCloudSafeMemoryCards({
      personaId: input.personaId,
      limit: input.limit ?? 12,
    })
    .catch(() => []);

  return rankPromptMemoryCards(cloudCards, {
    nowMs: input.nowMs ?? Date.now(),
    personaId: input.personaId,
    mode: input.mode,
    provider: "web_cloud",
  });
}

function dedupeMemoryCards(cards: MemoryCard[]): MemoryCard[] {
  const seen = new Set<string>();
  const result: MemoryCard[] = [];
  for (const card of cards) {
    if (seen.has(card.id)) continue;
    seen.add(card.id);
    result.push(card);
  }
  return result;
}
