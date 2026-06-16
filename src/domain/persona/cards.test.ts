import { describe, expect, it } from "vitest";
import { getPersonaCard, getPersonaPresentation } from "./cards";
import { PERSONA_IDS, normalizePersonaId } from "./types";
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
  it("exposes only the three structured MVP personas", () => {
    expect(PERSONA_IDS).toEqual(CARD_PERSONA_IDS);
    expect(PERSONA_IDS).not.toContain("warm_friend");
    expect(PERSONA_IDS).not.toContain("loving_partner");
    expect(PERSONA_IDS).not.toContain("steady_ally");
    expect(PERSONA_IDS).not.toContain("soft_care");
  });

  it("maps legacy generic persona ids to a structured persona", () => {
    expect(normalizePersonaId("warm_friend")).toBe("seoyeon-modern-senior");
    expect(normalizePersonaId("loving_partner")).toBe("seoyeon-modern-senior");
    expect(normalizePersonaId("steady_ally")).toBe("eiren-fantasy-guardian");
    expect(normalizePersonaId("soft_care")).toBe("seoyeon-modern-senior");
  });

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

  it("exposes relationship-first presentation metadata for persona selection", () => {
    const presentations = CARD_PERSONA_IDS.map((id) =>
      getPersonaPresentation(persona(id)),
    );

    for (const presentation of presentations) {
      expect(presentation.relationshipHook.length).toBeGreaterThan(8);
      expect(presentation.carePattern.length).toBeGreaterThan(8);
      expect(presentation.voiceSample.length).toBeGreaterThan(8);
      expect(presentation.recommendedFor.length).toBeGreaterThan(0);
      expect(presentation.headerLine.length).toBeGreaterThan(8);
    }
  });

  it("surfaces Makise Kurisu as a lab partner grounded in official traits", () => {
    const presentation = getPersonaPresentation(persona("makise-kurisu"));

    expect(presentation.relationshipHook).toContain("연구실");
    expect(presentation.carePattern).toContain("변수");
    expect(presentation.voiceSample).toContain("비약");
    expect(presentation.recommendedFor.join(" ")).toContain("코딩");
  });
});
