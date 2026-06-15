import type { Persona } from "../domain/persona/types";

const POCKET_INTRO_SUFFIX: Record<Persona["id"], string> = {
  warm_friend: "아까부터 조금 힘들어 보여서 그냥 지나가긴 좀 그랬어.",
  loving_partner: "네 마음이 조금 무거워 보여서, 편지처럼 조용히 곁에 앉았어.",
  fantasy_guardian: "그냥 지나치기엔 네 어깨가 조금 무거워 보여서 곁에 섰어.",
  quiet_companion: "말은 안 걸어도 될 것 같아서, 그냥 옆에만 있었어.",
  minimal_user: "한 줄만. 괜찮으면 여기 있을게.",
  cute_character: "살짝 걱정돼서… 그냥 이렇게 옆에 있을게.",
  nature_healing: "숨 한번 고르고 싶을 것 같아서, 조용히 옆에 앉았어.",
};

export function generatePocketIntro(nudge: string, persona: Persona): string {
  return `${nudge} ${POCKET_INTRO_SUFFIX[persona.id]}`;
}
