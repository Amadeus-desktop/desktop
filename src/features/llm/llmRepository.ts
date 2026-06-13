import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "../../lib/tauriRuntime";
import type { CompanionMessage } from "../companion/types";
import type { ModelRoute } from "../settings/types";
import type { LlmGeneration } from "./types";
import { toLlmChatRequest } from "./types";

export async function setLlmProviderRoute(
  modelRoute: ModelRoute,
  fallbackEnabled: boolean,
): Promise<void> {
  if (!isTauriRuntime()) return;

  await invoke("set_llm_provider_route", {
    modelRoute,
    fallbackEnabled,
  });
}

export async function generateChatReply(
  messages: CompanionMessage[],
): Promise<LlmGeneration> {
  if (isTauriRuntime()) {
    return invoke<LlmGeneration>("generate_chat_reply", {
      input: toLlmChatRequest(messages),
    });
  }

  return {
    message: "응. 천천히 해도 괜찮아. 나 여기 있어.",
    provider: "template",
  };
}
