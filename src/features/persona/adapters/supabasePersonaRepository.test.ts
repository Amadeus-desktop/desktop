import { describe, expect, it } from "vitest";
import { normalizePersonaRow } from "./supabasePersonaRepository";

describe("normalizePersonaRow", () => {
  it("maps a Supabase persona row into a cloud persona snapshot", () => {
    const snapshot = normalizePersonaRow({
      id: "persona-1",
      name: "한서연",
      base_tone: "restrained_warm",
      relationship_type: "ex_lover_senior",
      world_type: "modern_romance",
      static_prompt_json: {
        identity: { name: "한서연" },
        first_message: "늦은 시간이네. 물 한 모금 마실래?",
      },
      version: 4,
      updated_at: "2026-06-16T00:00:00.000Z",
      deleted_at: null,
      persona_states: [
        {
          relationship_stage: "unresolved_reunion",
          affinity: 34,
          trust_state: "stable",
          recent_mood: "quietly_regretful",
          open_loops: ["unfinished_reunion"],
          last_major_event: "rainy_late_work_reunion",
          boundary_overrides: {},
          state_source: "system",
          version: 2,
          expires_at: null,
        },
      ],
    });

    expect(snapshot).toMatchObject({
      remotePersonaId: "persona-1",
      name: "한서연",
      baseTone: "restrained_warm",
      relationshipType: "ex_lover_senior",
      worldType: "modern_romance",
      version: 4,
      deletedAt: null,
      personaStateJson: {
        relationship_stage: "unresolved_reunion",
        affinity: 34,
        version: 2,
      },
    });
    expect(snapshot.updatedAtMs).toBe(Date.parse("2026-06-16T00:00:00.000Z"));
  });
});
