import type { PersonaStateJson, PersonaStaticPromptJson } from "../persona";

export type PromptSurface = "web" | "app";
export type PromptMode = "nudge" | "pocket" | "deep";
export type PromptProvider = "web_cloud" | "app_local_qwen";

export type SemanticMemoryPromptItem = {
  id: string;
  content: string;
  confidence: number;
  scope: "cloud_safe" | "local_private";
};

export type EpisodicPromptItem = {
  id: string;
  summary: string;
  createdAtMs: number;
  scope: "cloud_safe" | "local_private";
};

export type SessionPromptMessage = {
  id: string;
  role: "user" | "assistant" | "system_summary";
  content: string;
  createdAtMs: number;
  clientSequence: number;
};

export type SafeCurrentContext = {
  source: "cloud_safe" | "user_visible";
  summary: string;
  allowed_surface: "web" | "app" | "both";
};

export type LocalRedactedContext = {
  source: "local_desktop";
  summary: string;
  trigger_type: string;
  coarse_context_label: string;
  confidence_bucket: string;
  redaction_policy_version: string;
  forbidden_keys_removed: string[];
  [key: string]: unknown;
};

export type PromptCurrentContext = SafeCurrentContext | LocalRedactedContext;

export type CompanionPromptInput = {
  surface: PromptSurface;
  mode: PromptMode;
  locale: string;
  isConversationStart: boolean;
  personaStatic: PersonaStaticPromptJson;
  personaState: PersonaStateJson | null;
  semanticMemories: SemanticMemoryPromptItem[];
  episodicContext: EpisodicPromptItem[];
  sessionMessages: SessionPromptMessage[];
  currentContext: PromptCurrentContext | null;
};

export type CompanionPromptEnvelope = {
  surface: PromptSurface;
  mode: PromptMode;
  locale: string;
  sectionOrder: string[];
  personaStatic: Pick<
    PersonaStaticPromptJson,
    | "identity"
    | "backstory"
    | "speech_style"
    | "relationship_boundary"
    | "forbidden_claims"
    | "negative_behavior"
    | "safety_boundary"
    | "privacy_contract"
  >;
  characterScenario: {
    scenario: unknown;
    worldLore: unknown;
    firstMessage: string | null;
    exampleDialogues: string[];
  };
  personaState: PersonaStateJson | null;
  semanticMemories: SemanticMemoryPromptItem[];
  episodicContext: EpisodicPromptItem[];
  sessionMessages: SessionPromptMessage[];
  currentContext: PromptCurrentContext | null;
  safetyContract: {
    forbiddenClaims: string[];
    negativeBehavior: string[];
    privacyContract: unknown;
  };
  outputContract: {
    maxSentences: number | null;
    responseTokenCap: number;
    format: "plain_text";
  };
};

const SECTION_ORDER = [
  "SYSTEM",
  "PERSONA STATIC",
  "CHARACTER SCENARIO",
  "PERSONA STATE",
  "SEMANTIC MEMORY CARDS",
  "EPISODIC CONTEXT",
  "SESSION MESSAGES",
  "CURRENT CONTEXT",
  "OUTPUT CONTRACT",
];

const MODE_RESPONSE_CAP: Record<PromptMode, number> = {
  nudge: 80,
  pocket: 300,
  deep: 900,
};

const MODE_MAX_SENTENCES: Record<PromptMode, number | null> = {
  nudge: 1,
  pocket: 2,
  deep: null,
};

const FORBIDDEN_CONTEXT_KEYS = new Set([
  "raw_ocr_text",
  "screenshot",
  "raw_window_title",
  "full_url",
  "file_path",
  "secret",
  "token",
]);

const FORBIDDEN_CONTEXT_VALUE_PATTERN =
  /(?:\/Users\/|[A-Z]:\\|https?:\/\/|\?.*=|token=|password=|passwd=|api_key=|apikey=|secret=|\.pdf|\.docx|\.xlsx|\.hwp)/i;

export function buildCompanionPromptEnvelope(
  input: CompanionPromptInput,
): CompanionPromptEnvelope {
  if (input.currentContext) {
    assertNoForbiddenContextKeys(input.currentContext);
    assertNoForbiddenContextValues(input.currentContext);
  }

  const personaStatic = input.personaStatic;
  const semanticMemories = [...input.semanticMemories].sort(
    (left, right) => right.confidence - left.confidence,
  );
  const episodicContext = [...input.episodicContext].sort(
    (left, right) => right.createdAtMs - left.createdAtMs,
  );
  const sessionMessages = [...input.sessionMessages].sort(
    (left, right) =>
      left.createdAtMs - right.createdAtMs ||
      left.clientSequence - right.clientSequence,
  );

  return {
    surface: input.surface,
    mode: input.mode,
    locale: input.locale,
    sectionOrder: SECTION_ORDER,
    personaStatic: {
      identity: personaStatic.identity,
      backstory: personaStatic.backstory,
      speech_style: personaStatic.speech_style,
      relationship_boundary: personaStatic.relationship_boundary,
      forbidden_claims: personaStatic.forbidden_claims,
      negative_behavior: personaStatic.negative_behavior,
      safety_boundary: personaStatic.safety_boundary,
      privacy_contract: personaStatic.privacy_contract,
    },
    characterScenario: {
      scenario: personaStatic.scenario,
      worldLore: personaStatic.world_lore,
      firstMessage: input.isConversationStart
        ? (personaStatic.first_message ?? null)
        : null,
      exampleDialogues: Array.isArray(personaStatic.example_dialogues)
        ? personaStatic.example_dialogues
        : [],
    },
    personaState: input.personaState,
    semanticMemories,
    episodicContext,
    sessionMessages,
    currentContext: input.currentContext,
    safetyContract: {
      forbiddenClaims: personaStatic.forbidden_claims ?? [],
      negativeBehavior: personaStatic.negative_behavior ?? [],
      privacyContract: personaStatic.privacy_contract ?? null,
    },
    outputContract: {
      maxSentences: MODE_MAX_SENTENCES[input.mode],
      responseTokenCap: MODE_RESPONSE_CAP[input.mode],
      format: "plain_text",
    },
  };
}

export function filterPromptEnvelopeForProvider(
  envelope: CompanionPromptEnvelope,
  provider: PromptProvider,
): CompanionPromptEnvelope {
  if (provider === "app_local_qwen") {
    return envelope;
  }

  return {
    ...envelope,
    semanticMemories: envelope.semanticMemories.filter(
      (memory) => memory.scope === "cloud_safe",
    ),
    episodicContext: envelope.episodicContext.filter(
      (episode) => episode.scope === "cloud_safe",
    ),
    currentContext:
      envelope.currentContext?.source === "local_desktop"
        ? null
        : envelope.currentContext,
  };
}

function assertNoForbiddenContextKeys(context: PromptCurrentContext): void {
  for (const key of Object.keys(context)) {
    if (FORBIDDEN_CONTEXT_KEYS.has(key)) {
      throw new Error(`prompt_context_forbidden_key:${key}`);
    }
  }
}

function assertNoForbiddenContextValues(value: unknown): void {
  if (typeof value === "string") {
    if (FORBIDDEN_CONTEXT_VALUE_PATTERN.test(value)) {
      throw new Error("prompt_context_forbidden_value");
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(assertNoForbiddenContextValues);
    return;
  }
  if (!value || typeof value !== "object") return;
  Object.values(value).forEach(assertNoForbiddenContextValues);
}
