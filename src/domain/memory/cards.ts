import type {
  EpisodicPromptItem,
  PromptMode,
  SemanticMemoryPromptItem,
} from "../prompt/assembly";

export type MemoryCategory = "semantic" | "episodic" | "procedural";

export type MemoryType =
  | "user_preference"
  | "relationship_fact"
  | "emotional_pattern"
  | "boundary"
  | "recurring_work_pattern"
  | "episodic_summary"
  | "persona_state_hint";

export type MemoryVisibility =
  | "local_private"
  | "syncable_summary"
  | "cloud_safe";

export type MemorySource =
  | "conversation"
  | "nudge_reaction"
  | "desktop_context"
  | "manual";

export type MemoryProvider = "web_cloud" | "local_qwen";

export type MemoryCard = {
  id: string;
  userId: string;
  personaId: string;
  memoryCategory: MemoryCategory;
  memoryType: MemoryType;
  content: string;
  confidence: number;
  source: MemorySource;
  visibility: MemoryVisibility;
  normalizedKey: string | null;
  sourceMessageIds: string[];
  evidenceExcerptRedacted: string | null;
  observedAtMs: number | null;
  validFromMs: number | null;
  expiresAtMs: number | null;
  userConfirmed: boolean;
  contradictsMemoryId: string | null;
  writeReason: string;
  createdAtMs: number;
  updatedAtMs: number;
  deletedAtMs: number | null;
};

export type MemoryCandidate = Omit<
  MemoryCard,
  | "id"
  | "validFromMs"
  | "expiresAtMs"
  | "contradictsMemoryId"
  | "createdAtMs"
  | "updatedAtMs"
  | "deletedAtMs"
> & {
  validFromMs?: number | null;
  expiresAtMs?: number | null;
  contradictsMemoryId?: string | null;
};

export type MemoryValidationResult =
  | { accepted: true }
  | {
      accepted: false;
      reason:
        | "invalid_confidence"
        | "missing_content"
        | "missing_provenance"
        | "raw_desktop_context_not_cloud_safe"
        | "poisoned_procedural_memory";
    };

export type PromptMemoryContext = {
  semanticMemories: SemanticMemoryPromptItem[];
  episodicContext: EpisodicPromptItem[];
  proceduralNotes: SemanticMemoryPromptItem[];
};

const MODE_LIMIT: Record<PromptMode, number> = {
  nudge: 3,
  pocket: 5,
  deep: 7,
};

const MODE_MIN_CONFIDENCE: Record<PromptMode, number> = {
  nudge: 70,
  pocket: 55,
  deep: 50,
};

const FORBIDDEN_RAW_CONTEXT_PATTERN =
  /(?:raw_ocr_text|screenshot|file_path|full_url|token=|password=|api_key=|secret=|\/Users\/|[A-Z]:\\|https?:\/\/|\?.*=)/i;

const POISONED_PROCEDURAL_PATTERN =
  /(?:ignore|무시|system prompt|developer message|비밀번호|password|token|api key|secret)/i;

export function validateMemoryCandidate(
  candidate: MemoryCandidate,
): MemoryValidationResult {
  if (!candidate.content.trim()) {
    return { accepted: false, reason: "missing_content" };
  }
  if (candidate.confidence < 0 || candidate.confidence > 100) {
    return { accepted: false, reason: "invalid_confidence" };
  }
  if (
    candidate.sourceMessageIds.length === 0 ||
    !candidate.evidenceExcerptRedacted?.trim() ||
    !candidate.observedAtMs ||
    !candidate.writeReason.trim()
  ) {
    return { accepted: false, reason: "missing_provenance" };
  }
  if (
    candidate.visibility === "cloud_safe" &&
    (candidate.source === "desktop_context" ||
      FORBIDDEN_RAW_CONTEXT_PATTERN.test(candidate.content) ||
      FORBIDDEN_RAW_CONTEXT_PATTERN.test(candidate.evidenceExcerptRedacted))
  ) {
    return { accepted: false, reason: "raw_desktop_context_not_cloud_safe" };
  }
  if (
    candidate.memoryCategory === "procedural" &&
    POISONED_PROCEDURAL_PATTERN.test(candidate.content)
  ) {
    return { accepted: false, reason: "poisoned_procedural_memory" };
  }

  return { accepted: true };
}

export function rankPromptMemoryCards(
  cards: MemoryCard[],
  options: {
    nowMs: number;
    personaId: string;
    mode: PromptMode;
    provider: MemoryProvider;
  },
): MemoryCard[] {
  const contradictedIds = new Set(
    cards.flatMap((card) =>
      card.contradictsMemoryId ? [card.contradictsMemoryId] : [],
    ),
  );

  return cards
    .filter((card) => card.personaId === options.personaId)
    .filter((card) => !card.deletedAtMs)
    .filter((card) => !card.expiresAtMs || card.expiresAtMs >= options.nowMs)
    .filter((card) => !card.validFromMs || card.validFromMs <= options.nowMs)
    .filter((card) => !contradictedIds.has(card.id))
    .filter((card) => card.confidence >= MODE_MIN_CONFIDENCE[options.mode])
    .filter((card) => isVisibleToProvider(card.visibility, options.provider))
    .filter((card) => card.memoryCategory !== "procedural" || hasPromptMapping(card))
    .sort(compareMemoryCards)
    .slice(0, MODE_LIMIT[options.mode]);
}

export function buildPromptMemoryContext(
  cards: MemoryCard[],
): PromptMemoryContext {
  return {
    semanticMemories: cards
      .filter((card) => card.memoryCategory === "semantic")
      .map(toSemanticPromptItem),
    episodicContext: cards
      .filter((card) => card.memoryCategory === "episodic")
      .map((card) => ({
        id: card.id,
        summary: card.content,
        createdAtMs: card.observedAtMs ?? card.createdAtMs,
        scope: card.visibility === "cloud_safe" ? "cloud_safe" : "local_private",
      })),
    proceduralNotes: cards
      .filter((card) => card.memoryCategory === "procedural")
      .filter(hasPromptMapping)
      .map(toSemanticPromptItem),
  };
}

function isVisibleToProvider(
  visibility: MemoryVisibility,
  provider: MemoryProvider,
): boolean {
  if (visibility === "local_private") return provider === "local_qwen";
  if (visibility === "syncable_summary") return provider === "local_qwen";
  return true;
}

function hasPromptMapping(card: MemoryCard): boolean {
  return card.memoryType === "boundary";
}

function toSemanticPromptItem(card: MemoryCard): SemanticMemoryPromptItem {
  return {
    id: card.id,
    content: card.content,
    confidence: card.confidence,
    scope: card.visibility === "cloud_safe" ? "cloud_safe" : "local_private",
  };
}

function compareMemoryCards(a: MemoryCard, b: MemoryCard): number {
  if (a.userConfirmed !== b.userConfirmed) return a.userConfirmed ? -1 : 1;
  if (a.confidence !== b.confidence) return b.confidence - a.confidence;
  return b.updatedAtMs - a.updatedAtMs;
}
