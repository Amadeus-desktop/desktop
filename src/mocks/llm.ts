import type { LlmGeneration, LlmProviderHealth } from "../features/llm/types";

export function browserLlmProviderHealth(): LlmProviderHealth[] {
  return [
    {
      provider: "template",
      available: true,
      detail: "browser preview",
    },
  ];
}

export function browserTestUtterance(): LlmGeneration {
  return {
    message: "조용히 오래 해내고 있었네.",
    provider: "template",
  };
}
