import { filterPromptEnvelopeForProvider } from "../../../domain/prompt/assembly";
import { getSupabaseClient } from "../../../lib/supabase/client";
import { logger } from "../../../observability/logger";
import type { LlmChatRequest, LlmGeneration } from "../types";

const LLM_GENERATE_FUNCTION = "llm-generate";

export async function generateEdgeChatReply(
  input: LlmChatRequest,
): Promise<LlmGeneration> {
  const supabase = getSupabaseClient();
  const cloudInput = {
    ...input,
    promptEnvelope: filterPromptEnvelopeForProvider(
      input.promptEnvelope,
      "web_cloud",
    ),
  };
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  logger.info("llm", "edge llm request starting", {
    personaId: input.personaId,
    hasSession: Boolean(sessionData.session),
    sessionError: sessionError ? sessionError.message : null,
    messageCount: input.messages.length,
  });
  const { data, error } = await supabase.functions.invoke(LLM_GENERATE_FUNCTION, {
    body: cloudInput,
  });
  if (error) {
    const detail = await readFunctionsErrorDetail(error);
    logger.warn("llm", "edge llm request failed", {
      personaId: input.personaId,
      error: error.message,
      name: error.name,
      status: "status" in error ? error.status : undefined,
      detail,
    });
    throw error;
  }
  const generation = normalizeEdgeLlmGeneration(data);
  logger.info("llm", "edge llm request completed", {
    personaId: input.personaId,
    provider: generation.provider,
  });
  return generation;
}

async function readFunctionsErrorDetail(error: unknown): Promise<string | null> {
  const context = (error as { context?: unknown }).context;
  if (!context || typeof context !== "object") return null;
  const response = context as { text?: () => Promise<string>; status?: number };
  if (typeof response.text !== "function") {
    return typeof response.status === "number" ? `status:${response.status}` : null;
  }

  try {
    return (await response.text()).slice(0, 500);
  } catch {
    return typeof response.status === "number" ? `status:${response.status}` : null;
  }
}

export function normalizeEdgeLlmGeneration(value: unknown): LlmGeneration {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid Edge LLM response");
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.message !== "string" ||
    !record.message.trim() ||
    typeof record.provider !== "string" ||
    !record.provider.trim()
  ) {
    throw new Error("Invalid Edge LLM response");
  }

  return {
    message: record.message,
    provider: `edge:${record.provider}`,
  };
}
