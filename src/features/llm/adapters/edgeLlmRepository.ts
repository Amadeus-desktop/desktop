import { getSupabaseClient } from "../../../lib/supabase/client";
import type { LlmChatRequest, LlmGeneration } from "../types";

const LLM_GENERATE_FUNCTION = "llm-generate";

export async function generateEdgeChatReply(
  input: LlmChatRequest,
): Promise<LlmGeneration> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke(LLM_GENERATE_FUNCTION, {
    body: input,
  });
  if (error) {
    throw error;
  }
  return normalizeEdgeLlmGeneration(data);
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
