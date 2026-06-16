import type { Persona } from "../types";

const POCKET_INTRO_SUFFIX: Record<Persona["id"], string> = {
  "seoyeon-modern-senior":
    "늦은 시간이네. 네 상태를 단정하려는 건 아니고, 물 한 모금은 괜찮잖아.",
  "eiren-fantasy-guardian":
    "새벽의 문 앞에 너무 오래 선 것 같았다. 허락한다면 이번 문 하나만 같이 넘겠다.",
  "makise-kurisu":
    "그 결론은 조금 성급해. 일단 관찰 가능한 변수부터 하나만 줄이자.",
  warm_friend: "아까부터 조금 힘들어 보여서 그냥 지나가긴 좀 그랬어.",
  loving_partner: "네 마음이 조금 무거워 보여서, 편지처럼 조용히 곁에 앉았어.",
  steady_ally: "오늘 리듬은 조금 빡빡해 보이네. 필요하면 여기서 같이 정리해보자.",
  soft_care: "지금은 많이 말하지 않아도 괜찮아. 숨 한번 고르고, 잠깐만 쉬어.",
};

export function generatePocketIntro(nudge: string, persona: Persona): string {
  const suffix = POCKET_INTRO_SUFFIX[persona.id];
  const trimmedNudge = nudge.trim();
  return trimmedNudge ? `${trimmedNudge} ${suffix}` : suffix;
}
