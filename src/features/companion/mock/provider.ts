import type { Persona, PersonaId } from "../../../domain/persona/types";
import type { TriggerType } from "../../../domain/trigger/types";

export const mockMemory =
  "사용자는 과한 응원보다 낮은 압박의 다정한 말을 선호한다.";

export const mockWorld = {
  warm_friend: "현대 친구형 companion",
  fantasy_guardian: "긴 여정을 지키는 조용한 수호자",
} satisfies Record<PersonaId, string>;

export function generateNudge(
  triggerType: TriggerType,
  persona: Persona,
): string {
  if (persona.id === "fantasy_guardian") {
    return triggerType === "milestone"
      ? "오래 검을 들고 있었네. 잠깐 손의 힘만 풀어도 괜찮아."
      : "짐이 조금 무거워진 것 같아. 숨만 한 번 고르고 가자.";
  }

  return triggerType === "milestone"
    ? "오래 붙잡고 있었네. 숨만 한 번 고르고 가자."
    : "잠깐 멈춘 것 같아서. 말 안 해도 괜찮아.";
}

export function generatePocketIntro(nudge: string, persona: Persona): string {
  if (persona.id === "fantasy_guardian") {
    return `${nudge} 그냥 지나치기엔 네 어깨가 조금 무거워 보여서 곁에 섰어.`;
  }

  return `${nudge} 아까부터 조금 힘들어 보여서 그냥 지나가긴 좀 그랬어.`;
}

export function generateDeepReply(
  userInput: string,
  persona: Persona,
  memory: string,
  world: string,
): string {
  const normalizedInput = userInput.trim();

  if (persona.id === "fantasy_guardian") {
    return [
      `지금은 네가 약해서 멈춘 게 아니야. ${world}로서 보면, 오래 든 짐이 무거워진 순간에 가까워.`,
      `${normalizedInput}라고 느끼는 건 충분히 그럴 만해. 잠깐 검을 내려놓고, 가장 무거운 한 조각만 같이 바라보자.`,
    ].join(" ");
  }

  return [
    `그럴 만해. ${normalizedInput} 상태면 계속 붙잡고 있을수록 더 크게 느껴질 수 있어.`,
    `${memory} 그러니까 지금은 완벽하게 하려고 하기보다, 제출 가능한 작은 뼈대 하나만 남기는 쪽이 좋겠어.`,
  ].join(" ");
}
