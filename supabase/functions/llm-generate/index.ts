type LlmChatMessage = {
  role: "assistant" | "companion" | "user";
  content: string;
};

type LlmChatRequest = {
  messages: LlmChatMessage[];
  locale: string;
  personaId: string;
  nickname: string;
  promptEnvelope: unknown | null;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "missing_authorization" }, 401);
  }
  const userId = await verifySupabaseJwt(authHeader);
  if (!userId) {
    return jsonResponse({ error: "invalid_authorization" }, 401);
  }

  let input: LlmChatRequest;
  try {
    input = validateRequest(await request.json());
  } catch (error) {
    return jsonResponse({ error: errorMessage(error) }, 400);
  }

  try {
    input = await enrichWithCloudMemoryRag(input, authHeader);
    const provider = selectedProvider();
    const message =
      provider === "gemini"
        ? await generateWithGemini(input)
        : await generateWithOpenAi(input);
    return jsonResponse({ message, provider });
  } catch (error) {
    return jsonResponse({ error: errorMessage(error) }, 500);
  }
});

function validateRequest(value: unknown): LlmChatRequest {
  if (!value || typeof value !== "object") {
    throw new Error("invalid_request");
  }
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.messages) || record.messages.length === 0) {
    throw new Error("messages_required");
  }
  const messages = record.messages.map((message) => {
    if (!message || typeof message !== "object") {
      throw new Error("invalid_message");
    }
    const item = message as Record<string, unknown>;
    if (
      (item.role !== "assistant" &&
        item.role !== "companion" &&
        item.role !== "user") ||
      typeof item.content !== "string" ||
      !item.content.trim()
    ) {
      throw new Error("invalid_message");
    }
    return {
      role: item.role === "companion" ? "assistant" : item.role,
      content: item.content.slice(0, 2_000),
    };
  });

  return {
    messages: messages.slice(-12),
    locale: stringField(record.locale, "ko").slice(0, 8),
    personaId: stringField(record.personaId, "seoyeon-modern-senior").slice(0, 64),
    nickname: stringField(record.nickname, "작업자").slice(0, 64),
    promptEnvelope: normalizePromptEnvelope(record.promptEnvelope),
  };
}

async function verifySupabaseJwt(authHeader: string): Promise<string | null> {
  const supabaseUrl =
    Deno.env.get("SUPABASE_URL") || Deno.env.get("PUBLIC_SUPABASE_URL");
  const anonKey =
    Deno.env.get("SUPABASE_ANON_KEY") ||
    Deno.env.get("PUBLIC_SUPABASE_ANON_KEY") ||
    Deno.env.get("PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  if (!supabaseUrl || !anonKey) return null;

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      authorization: authHeader,
    },
  });
  if (!response.ok) return null;
  const user = await response.json();
  return typeof user?.id === "string" ? user.id : null;
}

function selectedProvider(): "openai" | "gemini" {
  const configured = Deno.env.get("LLM_PROVIDER")?.toLowerCase();
  if (configured === "gemini" || configured === "openai") return configured;
  if (Deno.env.get("GEMINI_API_KEY")) return "gemini";
  if (Deno.env.get("OPENAI_API_KEY")) return "openai";
  throw new Error("llm_provider_not_configured");
}

async function generateWithOpenAi(input: LlmChatRequest): Promise<string> {
  const apiKey = requiredEnv("OPENAI_API_KEY");
  const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      max_tokens: maxOutputTokens(input),
      messages: [
        { role: "system", content: systemPrompt(input) },
        ...input.messages.map((message) => ({
          role: message.role === "user" ? "user" : "assistant",
          content: message.content,
        })),
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`openai_failed_${response.status}`);
  }
  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("openai_empty_response");
  }
  return content.trim();
}

async function generateWithGemini(input: LlmChatRequest): Promise<string> {
  const apiKey = requiredEnv("GEMINI_API_KEY");
  const model = Deno.env.get("GEMINI_MODEL") || "gemini-1.5-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt(input) }] },
        contents: input.messages.map((message) => ({
          role: message.role === "user" ? "user" : "model",
          parts: [{ text: message.content }],
        })),
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: maxOutputTokens(input),
        },
      }),
    },
  );
  if (!response.ok) {
    throw new Error(`gemini_failed_${response.status}`);
  }
  const json = await response.json();
  const content = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("gemini_empty_response");
  }
  return content.trim();
}

function maxOutputTokens(input: LlmChatRequest): number {
  const envelope = input.promptEnvelope as
    | { outputContract?: { responseTokenCap?: number } }
    | null
    | undefined;
  const cap = envelope?.outputContract?.responseTokenCap;
  if (typeof cap === "number" && cap > 0) {
    return Math.min(Math.round(cap), 512);
  }
  return 160;
}

function systemPrompt(input: LlmChatRequest): string {
  const promptContext = input.promptEnvelope
    ? JSON.stringify(input.promptEnvelope).slice(0, 6_000)
    : `Persona: ${input.personaId}`;

  return [
    "You are Amadeus, a gentle local desktop companion.",
    "Reply briefly, warmly, and without claiming access to hidden context.",
    `Locale: ${input.locale}`,
    `Nickname: ${input.nickname}`,
    "Use this structured prompt context as source-of-truth persona and memory input.",
    promptContext,
  ].join("\n");
}

async function enrichWithCloudMemoryRag(
  input: LlmChatRequest,
  authHeader: string,
): Promise<LlmChatRequest> {
  if (!input.promptEnvelope || typeof input.promptEnvelope !== "object") {
    return input;
  }

  try {
    const query = ragQueryText(input);
    if (!query) return input;
    const embeddingModel = Deno.env.get("GEMINI_EMBEDDING_MODEL") ||
      "gemini-embedding-001";
    const embedding = await generateGeminiEmbedding(query, embeddingModel);
    const personaUuid = await resolvePersonaUuid(input.personaId, authHeader);
    if (!personaUuid) return input;
    const matches = await matchCloudMemories({
      authHeader,
      personaUuid,
      embedding,
      embeddingModel,
    });
    if (matches.length === 0) return input;

    return {
      ...input,
      promptEnvelope: mergeRagMatchesIntoEnvelope(
        input.promptEnvelope as Record<string, unknown>,
        matches,
      ),
    };
  } catch {
    return input;
  }
}

function ragQueryText(input: LlmChatRequest): string {
  const latestUser = [...input.messages]
    .reverse()
    .find((message) => message.role === "user")?.content;
  const envelope = input.promptEnvelope as
    | { currentContext?: { summary?: unknown } | null }
    | null;
  const currentContext =
    typeof envelope?.currentContext?.summary === "string"
      ? envelope.currentContext.summary
      : "";
  return [latestUser, currentContext]
    .filter((part): part is string => Boolean(part?.trim()))
    .join("\n")
    .slice(0, 2_000);
}

async function generateGeminiEmbedding(
  query: string,
  embeddingModel: string,
): Promise<number[]> {
  const apiKey = requiredEnv("GEMINI_API_KEY");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${embeddingModel}:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        content: {
          parts: [{ text: query }],
        },
        taskType: "RETRIEVAL_QUERY",
        outputDimensionality: 1536,
      }),
    },
  );
  if (!response.ok) {
    throw new Error(`gemini_embedding_failed_${response.status}`);
  }
  const json = await response.json();
  const values = json?.embedding?.values ?? json?.embeddings?.[0]?.values;
  if (!Array.isArray(values)) throw new Error("gemini_embedding_empty");
  return values.map(Number).filter(Number.isFinite);
}

async function resolvePersonaUuid(
  personaIdOrSlug: string,
  authHeader: string,
): Promise<string | null> {
  if (isUuid(personaIdOrSlug)) return personaIdOrSlug;
  const supabaseUrl = requiredSupabaseUrl();
  const anonKey = requiredSupabaseAnonKey();
  const url = new URL(`${supabaseUrl}/rest/v1/personas`);
  url.searchParams.set("select", "id");
  url.searchParams.set("slug", `eq.${personaIdOrSlug}`);
  url.searchParams.set("limit", "1");
  const response = await fetch(url, {
    headers: {
      apikey: anonKey,
      authorization: authHeader,
    },
  });
  if (!response.ok) throw new Error(`persona_lookup_failed_${response.status}`);
  const rows = await response.json();
  const id = Array.isArray(rows) ? rows[0]?.id : null;
  return typeof id === "string" ? id : null;
}

type CloudMemoryMatch = {
  id: string;
  memory_category: string;
  content: string;
  confidence: number;
  created_at: string;
};

async function matchCloudMemories(input: {
  authHeader: string;
  personaUuid: string;
  embedding: number[];
  embeddingModel: string;
}): Promise<CloudMemoryMatch[]> {
  const supabaseUrl = requiredSupabaseUrl();
  const anonKey = requiredSupabaseAnonKey();
  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/match_cloud_memories`,
    {
      method: "POST",
      headers: {
        apikey: anonKey,
        authorization: input.authHeader,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        query_embedding: input.embedding,
        match_persona_id: input.personaUuid,
        match_memory_types: null,
        match_threshold: 0.74,
        match_count: 8,
        match_embedding_model: input.embeddingModel,
      }),
    },
  );
  if (!response.ok) throw new Error(`memory_match_failed_${response.status}`);
  const rows = await response.json();
  return Array.isArray(rows) ? rows as CloudMemoryMatch[] : [];
}

function mergeRagMatchesIntoEnvelope(
  envelope: Record<string, unknown>,
  matches: CloudMemoryMatch[],
): Record<string, unknown> {
  const semanticMemories = Array.isArray(envelope.semanticMemories)
    ? [...envelope.semanticMemories]
    : [];
  const episodicContext = Array.isArray(envelope.episodicContext)
    ? [...envelope.episodicContext]
    : [];
  const seen = new Set(
    [...semanticMemories, ...episodicContext]
      .map((item) =>
        item && typeof item === "object" ? (item as { id?: unknown }).id : null
      )
      .filter((id): id is string => typeof id === "string"),
  );

  for (const match of matches) {
    if (seen.has(match.id)) continue;
    seen.add(match.id);
    if (match.memory_category === "episodic") {
      episodicContext.push({
        id: match.id,
        summary: match.content,
        createdAtMs: Date.parse(match.created_at) || Date.now(),
        scope: "cloud_safe",
      });
    } else {
      semanticMemories.push({
        id: match.id,
        content: match.content,
        confidence: Number(match.confidence) || 0,
        scope: "cloud_safe",
      });
    }
  }

  return {
    ...envelope,
    semanticMemories: semanticMemories.slice(0, 8),
    episodicContext: episodicContext.slice(0, 8),
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function requiredSupabaseUrl(): string {
  return (
    Deno.env.get("SUPABASE_URL") ||
    Deno.env.get("PUBLIC_SUPABASE_URL") ||
    requiredEnv("SUPABASE_URL")
  );
}

function requiredSupabaseAnonKey(): string {
  return (
    Deno.env.get("SUPABASE_ANON_KEY") ||
    Deno.env.get("PUBLIC_SUPABASE_ANON_KEY") ||
    Deno.env.get("PUBLIC_SUPABASE_PUBLISHABLE_KEY") ||
    requiredEnv("SUPABASE_ANON_KEY")
  );
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name.toLowerCase()}_missing`);
  return value;
}

function stringField(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function normalizePromptEnvelope(value: unknown): unknown | null {
  if (!value || typeof value !== "object") return null;
  return value;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json",
    },
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown_error";
}
