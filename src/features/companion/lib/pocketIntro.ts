import type { Persona } from "../types";

const POCKET_INTRO_SUFFIX: Record<Persona["id"], string> = {
  "seoyeon-modern-senior":
    "늦은 시간이네. 네 상태를 단정하려는 건 아니고, 물 한 모금은 괜찮잖아.",
  "eiren-fantasy-guardian":
    "새벽의 문 앞에 너무 오래 선 것 같았다. 허락한다면 이번 문 하나만 같이 넘겠다.",
  "makise-kurisu":
    "잠깐만. 단정하려는 건 아니고, 지금은 관찰 가능한 변수부터 하나만 줄이는 게 나아.",
};

export function generatePocketIntro(nudge: string, persona: Persona): string {
  const suffix = POCKET_INTRO_SUFFIX[persona.id];
  const trimmedNudge = nudge.trim();
  return trimmedNudge || suffix;
}
