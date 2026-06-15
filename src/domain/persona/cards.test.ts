import { describe, expect, it } from "vitest";
import { getPersonaCard } from "./cards";
import type { Persona, PersonaId } from "./types";

const CARD_PERSONA_IDS: PersonaId[] = [
  "seoyeon-modern-senior",
  "eiren-fantasy-guardian",
  "makise-kurisu",
];

function persona(id: PersonaId): Persona {
  return {
    id,
    name: id,
    shortLabel: id,
    description: id,
    icon: "bubble",
  };
}

describe("persona cards", () => {
  it("loads the three MVP character cards from structured JSON", () => {
    const cards = CARD_PERSONA_IDS.map((id) => getPersonaCard(persona(id)));

    expect(cards.map((card) => card.id)).toEqual(CARD_PERSONA_IDS);
    for (const card of cards) {
      expect(card.version).toBeGreaterThanOrEqual(2);
      expect(card.staticPromptJson.identity.name).toBeTruthy();
      expect(card.staticPromptJson.first_message).toBeTruthy();
      expect(card.staticPromptJson.example_dialogues?.length).toBeGreaterThan(0);
      expect(card.staticPromptJson.relationship_boundary).toBeTruthy();
      expect(card.staticPromptJson.safety_boundary).toBeTruthy();
      expect(card.staticPromptJson.privacy_contract).toBeTruthy();
      expect(card.personaStateSeed.version).toBeGreaterThanOrEqual(1);
      expect(["stable", "strained", "repair_needed"]).toContain(
        card.personaStateSeed.trust_state,
      );
      expect(["conversation", "explicit_user_edit", "system"]).toContain(
        card.personaStateSeed.state_source,
      );
    }
  });

  it("keeps Makise Kurisu source boundaries explicit", () => {
    const card = getPersonaCard(persona("makise-kurisu"));

    expect(card.staticPromptJson.canon_anchor).toMatchObject({
      source_priority: expect.arrayContaining(["official_steinsgate_site"]),
      uncertain_or_not_used: expect.arrayContaining([
        expect.stringContaining("Pixiv Dictionary"),
      ]),
    });
    expect(card.staticPromptJson.scientific_boundary).toBeTruthy();
  });
});
