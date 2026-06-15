# Female-Oriented AI Chat Market Notes

## Scope

2026-06-16 KST 기준 공개 페이지와 sub-agent 조사 결과를 바탕으로 정리한다.

내부 프롬프트, 모델 튜닝, 추천 알고리즘은 공개 근거가 없어 모르겠습니다.

## LoveyDovey Observations

사실:

- LoveyDovey 공식 웹의 character 화면에는 `트렌딩`, `베스트`, `신규` 탭이 있다.
- 공개 필터는 `전체`, `현대 로맨스`, `로판`, `학원`, `판타지`, `BL`, `GL`, `일상`, `기타`로 확인됐다.
- 트렌딩 상위권에서 확인된 반복 태그/소재는 `사랑꾼`, `대형견남`, `츤데레`, `질투쟁이`, `소유욕`, `집착남`, `후회남`, `다정함`, `일편단심`, `재벌/기업가`, `정략결혼`, `소꿉친구`, `학원물`, `BL/GL`이다.
- 트렌딩 상위권 일부는 `숨겨진 아이/재회`, `전 여친`, `쟁탈 구도`, `학교 권력자`, `가족/재결합`, `다인물 보호/소유 구도` 같은 강한 첫 상황을 사용했다.
- LoveyDovey 번들에서 캐릭터 생성 필드로 보이는 문자열은 `name`, `age`, `job`, `description`, `basicInfo`, `backgroundStory`, `characteristic`, `speechPattern`, `initialSituation`, `greetingmessage`, `likes`, `dislikes`, `additionalInfo`, `events`, `lorebook`, `intimacy` 등이 확인됐다.

출처:

- `https://loveydovey.ai/?tab=character&subTab=trending`
- `https://loveydovey.ai/?tab=character&subTab=best`
- `https://loveydovey.ai/characters/lkQtyqRZsDILG2Lk0HNv`

한계:

- 성인 콘텐츠 토글은 켜지 않았다.
- 개별 캐릭터의 내부 prompt는 확인하지 못했다.
- 카드별 장르는 명시 필드가 아니라 필터/태그/카피 기반으로만 해석했다.

## Zeta / Character.AI / Otome Pattern

사실:

- Character.AI 공식 Character Book은 Greeting, Long Description, Definition, Example Conversations, 사용자 피드백이 캐릭터 반응에 영향을 준다고 설명한다.
- Character.AI 공개 분석 논문은 210만 개 greeting을 분석 대상으로 삼고, 캐릭터 시장에서 첫 장면과 관계 권력 구도가 중요함을 보여준다.
- Zeta 공개 홈/랭킹에는 `#연인`, `#동거`, `#마피아`, `#능글`, `#유저바라기`, `#질투`, `#구원`, `#삼각관계`, `#소유욕`, `#피폐`, `#HL`, `#BL` 같은 태그가 노출된다.
- 일본 오토메 계열은 캐릭터, 선택지, 호감도/루트, 카드/보이스/친밀도 기능을 전면에 둔다.

출처:

- Character.AI Character Book: `https://book.character.ai/`
- Character.AI public chatbot analysis: `https://arxiv.org/abs/2505.13354`
- Zeta: `https://zeta-ai.io/ko`
- Mystic Messenger: `https://en.wikipedia.org/wiki/Mystic_Messenger`
- Love and Deepspace: `https://en.wikipedia.org/wiki/Love_and_Deepspace`

## Design Implications

사실과 추정을 구분하면, 내부 구현은 모르지만 공개 표면에서 강하게 보이는 패턴은 다음이다.

추정:

- 여성향 AI chat에서 강한 훅은 성격보다 관계 진입 장면이다.
- `다정함`만으로는 약하고, `거리감 -> 균열 -> 선택적 다정함` 구조가 더 잘 맞을 가능성이 높다.
- 냉정하거나 위험한 캐릭터도 보상 신호가 있어야 한다. 예: `너에게만 다정함`, `일편단심`, `아내바보`, `대형견남`, `순애`.

## Amadeus Persona Fields

Amadeus persona card에는 다음 필드를 추가로 유지한다.

```text
genre_bucket
relationship_hook
opening_scene
emotional_tension
reward_signal
risk_flag
user_role
speech_style
care_pattern
multi_character_mode
first_copy
safety_boundary
user_addressing
```

## Guardrails

- Desktop context를 많이 아는 척하지 않는다.
- 집착/질투/소유욕을 사용할 수는 있지만, 사용자의 거절을 무시하지 않는다.
- 감금, 강압, 미성년자, 교사-학생, 비동의, 현실 인물/사망자 모사는 피한다.
- 위기 신호에서는 로맨스 긴장을 낮추고 안전 안내를 우선한다.
- Nudge 단계에서는 고자극 관계 훅을 약하게만 사용한다.
