# Persona Card Contract

Amadeus persona는 UI label이 아니라 LLM 입력용 character card로 관리한다.

## External Pattern Notes

Character.AI 공식 Character Book 기준으로 character response에는 character attributes, training feedback, user persona, current conversation context가 함께 영향을 준다. Character attributes에는 name, greeting, short/long description, categories, example conversations, definition 같은 필드가 있다.

Zeta 공개 랭킹 페이지 기준으로 인기 character entry는 짧은 상황 훅, 관계/장르 태그, 사용량 신호가 함께 노출된다. 여성향/로맨스형 캐릭터는 `혐관`, `피폐`, `재벌`, `집착`, `소유욕`, `로판`, `회귀`, `철벽`처럼 감정 긴장과 관계 구조를 빠르게 전달하는 태그를 많이 사용한다.

Amadeus는 이 패턴을 그대로 복제하지 않고 다음처럼 안전한 내부 구조로 변환한다.

| External pattern | Amadeus field |
| --- | --- |
| name | `name`, `staticPromptJson.identity.name` |
| greeting / first message | `staticPromptJson.first_message` |
| short/long description | `staticPromptJson.identity`, `backstory`, `scenario` |
| categories / tags | `marketPosition`, `worldType`, `relationshipType` |
| example conversations | `staticPromptJson.example_dialogues` |
| hidden definition | `staticPromptJson.speech_style`, `relationship_boundary`, `safety_boundary`, `privacy_contract` |
| character training feedback | future memory/reaction system, not static card |
| user persona/current context | `personaStateSeed`, memory cards, session messages, current context |

## Code Contract

The JSON cards live in:

```text
src/domain/persona/cards/*.json
```

The loader lives in:

```text
src/domain/persona/cards.ts
```

Prompt assembly must use the full `staticPromptJson`.
It must not rebuild persona from compact UI labels.

## MVP Cards

| Slug | Role |
| --- | --- |
| `seoyeon-modern-senior` | 여성향 현대 재회 로맨스 |
| `eiren-fantasy-guardian` | 여성향 로판 수호 기사 |
| `makise-kurisu` | 남성향 과학자/연구실 파트너 |

## Source Boundary

Makise Kurisu is a copyrighted existing character.
The card keeps a `canon_anchor` section and avoids long quote reuse or full scene recreation.
If Amadeus is released publicly or commercially with this persona enabled, legal/product review is required.

## Supabase Contract

Supabase `personas.id` is a UUID.
App persona identifiers such as `makise-kurisu` are slugs.

The cloud contract therefore includes:

```text
personas.id    -> remote UUID
personas.slug  -> stable app/persona card identifier
```

Web and app must match persona templates by `slug`, not by UUID.
