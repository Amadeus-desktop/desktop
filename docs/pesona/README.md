# Amadeus Persona Cards

이 문서는 Amadeus의 초기 페르소나 3종 character card 초안이다.

경로명은 사용자 요청에 맞춰 `docs/pesona`를 사용한다.

## 기준

Phase 01의 `personas.static_prompt_json`과 `persona_states` 계약을 따른다.

구성 방식:

- character card: 정적 캐릭터 정의
- first message: 첫 진입 장면
- scenario: 관계가 시작되는 상황
- example dialogues: 말투 고정용 예시
- dynamic state seed: 초기 관계 상태
- nudge/pocket/deep behavior: Amadeus desktop companion 단계별 행동
- market hook: 공개 여성향 AI chat/오토메 패턴에서 확인되는 관계 훅

## 공개 근거와 한계

사실:

- Character.AI류는 캐릭터 설명, greeting, 예시 대화, 피드백으로 캐릭터성을 고정하는 패턴이 공개적으로 확인된다.
- Replika류는 장기 관계, 관계 타입, memory/database/RAG 계층을 중시한다.

근거가 부족합니다:

- Zeta, 러비더비의 내부 persona schema와 prompt format은 신뢰 가능한 공개 자료가 부족하다.

추정:

- 한국형 AI chat app에서 많이 쓰이는 제품 패턴은 `캐릭터 카드 + 첫 상황 + 관계 판타지 + 말투 예시 + 호감도/관계 상태 + 대화 기억` 조합으로 보는 것이 합리적이다.

## Persona List

| id | name | target | world_type | relationship_type |
| --- | --- | --- | --- | --- |
| `seoyeon-modern-senior` | 한서연 | 여성향 현대 | modern_romance | ex_lover_senior |
| `eiren-fantasy-guardian` | 에이렌 | 여성향 판타지 | romantic_fantasy | cursed_sworn_guardian |
| `makise-kurisu` | 마키세 크리스 | 남성향 캐릭터 | sci_fi_modern | lab_partner |

## Files

- [한서연](./seoyeon-modern-senior.md)
- [에이렌](./eiren-fantasy-guardian.md)
- [마키세 크리스](./makise-kurisu.md)
- [여성향 시장 조사 노트](./female-market-research.md)
