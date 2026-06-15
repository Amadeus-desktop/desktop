import type { Persona } from "../domain/persona/types";

const POCKET_INTRO_SUFFIX: Record<Persona["id"], string> = {
  warm_friend: "아까부터 조금 힘들어 보여서 그냥 지나가긴 좀 그랬어.",
  loving_partner: "네 마음이 조금 무거워 보여서, 편지처럼 조용히 곁에 앉았어.",
  steady_ally: "오늘 리듬은 조금 빡빡해 보이네. 필요하면 여기서 같이 정리해보자.",
  soft_care: "지금은 많이 말하지 않아도 괜찮아. 숨 한번 고르고, 잠깐만 쉬어.",
};

export function generatePocketIntro(nudge: string, persona: Persona): string {
  return `${nudge} ${POCKET_INTRO_SUFFIX[persona.id]}`;
}

export const mockPersonaReplies = POCKET_INTRO_SUFFIX;
