import { invoke } from "@tauri-apps/api/core";
import { buildBrowserTemplateChatReply } from "../../domain/llm/templateReply";
import {
  browserLlmProviderHealth,
  browserTestUtterance,
} from "../../mocks/llm";
import { getAppLocale } from "../../i18n";
import { isTauriRuntime } from "../../lib/tauriRuntime";
import type { Persona } from "../../domain/persona/types";
import type { CompanionMessage } from "../companion/types";
import type { GeneralSettings } from "../settings/types";
import type { LlmGeneration, LlmProviderHealth } from "./types";
import { toLlmChatRequest } from "./types";

export async function generateChatReply(
  messages: CompanionMessage[],
  persona: Persona,
  settings: GeneralSettings,
): Promise<LlmGeneration> {
  if (isTauriRuntime()) {
    return invoke<LlmGeneration>("generate_chat_reply", {
      input: toLlmChatRequest(messages, {
        locale: settings.locale,
        personaId: persona.id,
        nickname: settings.nickname,
      }),
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
