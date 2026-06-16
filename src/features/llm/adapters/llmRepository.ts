import { invoke } from "@tauri-apps/api/core";
import { buildBrowserTemplateChatReply } from "../../../domain/llm/templateReply";
import {
  browserLlmProviderHealth,
  browserTestUtterance,
} from "../../../mocks/llm";
import { getAppLocale } from "../../../i18n";
import { isTauriRuntime } from "../../../lib/tauri/runtime";
import { logger } from "../../../observability/logger";
import type { Persona } from "../../../domain/persona/types";
import type { MemoryCard } from "../../../domain/memory/cards";
import type {
  PromptCurrentContext,
  PromptMode,
} from "../../../domain/prompt/assembly";
import type { CompanionMessage } from "../../companion/types";
import type { GeneralSettings } from "../../settings/types";
import type { LlmGeneration, LlmProviderHealth } from "../types";
import { toLlmChatRequest } from "../types";
import { generateEdgeChatReply } from "./edgeLlmRepository";

export async function generateChatReply(
  messages: CompanionMessage[],
  persona: Persona,
  settings: GeneralSettings,
  options: {
    mode?: PromptMode;
    memoryCards?: MemoryCard[];
    currentContext?: PromptCurrentContext | null;
  } = {},
): Promise<LlmGeneration> {
  const input = toLlmChatRequest(messages, {
    locale: settings.locale,
    personaId: persona.id,
    nickname: settings.nickname,
    persona,
    mode: options.mode,
    memoryCards: options.memoryCards,
    currentContext: options.currentContext,
  });

  if (settings.modelRoute === "api-first") {
    try {
      return await generateEdgeChatReply(input);
    } catch (error) {
      logger.warn("llm", "edge llm fallback activated", {
        personaId: persona.id,
        route: settings.modelRoute,
        fallbackEnabled: settings.localFallbackEnabled,
        error: error instanceof Error ? error.message : String(error),
      });
      // Keep the local/template fallback path available when the cloud edge route is unavailable.
    }
  }

  if (isTauriRuntime()) {
    return invoke<LlmGeneration>("generate_chat_reply", {
      input,
    });
  }

  return buildBrowserTemplateChatReply(
    messages,
    getAppLocale(settings.locale).llm.template,
  );
}

export async function loadLlmProviderHealth(): Promise<LlmProviderHealth[]> {
  if (!isTauriRuntime()) {
    return browserLlmProviderHealth();
  }

  return invoke<LlmProviderHealth[]>("get_llm_provider_health");
}

export async function generateTestUtterance(): Promise<LlmGeneration> {
  if (!isTauriRuntime()) {
    return browserTestUtterance();
  }

  return invoke<LlmGeneration>("generate_test_utterance");
}
