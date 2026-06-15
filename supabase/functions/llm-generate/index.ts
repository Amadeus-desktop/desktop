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
    personaId: stringField(record.personaId, "warm_friend").slice(0, 64),
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
  if (Deno.env.get("OPENAI_API_KEY")) return "openai";
  if (Deno.env.get("GEMINI_API_KEY")) return "gemini";
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
      max_tokens: 160,
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
          maxOutputTokens: 160,
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
