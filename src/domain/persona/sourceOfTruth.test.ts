import { describe, expect, it } from "vitest";
import {
  assertPersonaStateCannotOverwriteStaticIdentity,
  buildLocalPersonaCache,
  mergeRemotePersonaCache,
  type CloudPersonaSnapshot,
  type LocalPersonaCache,
  type PersonaStateJson,
} from "./sourceOfTruth";

const staticPrompt = {
  identity: { name: "한서연" },
  first_message: "늦은 시간이네. 물 한 모금 마실래?",
};

const personaState: PersonaStateJson = {
  relationship_stage: "unresolved_reunion",
  affinity: 34,
  trust_state: "stable",
  recent_mood: "quietly_regretful",
  open_loops: [],
  last_major_event: "rainy_late_work_reunion",
  boundary_overrides: {},
  state_source: "system",
  version: 1,
};

function remotePersona(version: number): CloudPersonaSnapshot {
  return {
    remotePersonaId: "persona-1",
    name: "한서연",
    baseTone: "restrained_warm",
    relationshipType: "ex_lover_senior",
    worldType: "modern_romance",
    staticPromptJson: staticPrompt,
    personaStateJson: personaState,
    version,
    updatedAtMs: 1_000 + version,
    deletedAt: null,
  };
}

function localPersona(version: number): LocalPersonaCache {
  return buildLocalPersonaCache(remotePersona(version));
}

describe("persona source of truth cache policy", () => {
  it("inserts a remote persona when no local cache exists", () => {
    const decision = mergeRemotePersonaCache(null, remotePersona(1));

    expect(decision.action).toBe("insert");
    expect(decision.cache.remotePersonaId).toBe("persona-1");
    expect(decision.cache.remoteVersion).toBe(1);
    expect(decision.cache.lastPulledVersion).toBe(1);
    expect(decision.cache.syncStatus).toBe("synced");
  });

  it("replaces local cache when remote version increases", () => {
    const decision = mergeRemotePersonaCache(localPersona(1), remotePersona(2));

    expect(decision.action).toBe("replace");
    expect(decision.cache.remoteVersion).toBe(2);
    expect(decision.cache.lastPulledVersion).toBe(2);
  });

  it("does not overwrite newer local cache with an older remote version", () => {
    const local = localPersona(3);
    const decision = mergeRemotePersonaCache(local, remotePersona(2));

    expect(decision.action).toBe("keep");
    expect(decision.cache).toBe(local);
  });

  it("keeps pending local mutation when remote has not advanced", () => {
    const local = {
      ...localPersona(2),
      pendingMutationId: "mutation-1",
      syncStatus: "pending" as const,
    };

    const decision = mergeRemotePersonaCache(local, remotePersona(2));

    expect(decision.action).toBe("keep");
    expect(decision.cache).toBe(local);
  });

  it("marks pending local mutation as conflicted when remote advances", () => {
    const local = {
      ...localPersona(2),
      pendingMutationId: "mutation-1",
      syncStatus: "pending" as const,
    };

    const decision = mergeRemotePersonaCache(local, remotePersona(3));

    expect(decision.action).toBe("conflict");
    expect(decision.cache.syncStatus).toBe("conflicted");
    expect(decision.cache.pendingMutationId).toBe("mutation-1");
    expect(decision.cache.remoteVersion).toBe(2);
    expect(decision.cache.lastPulledVersion).toBe(3);
  });

  it("rejects persona state attempts to overwrite static identity", () => {
    expect(() =>
      assertPersonaStateCannotOverwriteStaticIdentity({
        ...personaState,
        boundary_overrides: {
          identity: { name: "다른 이름" },
        },
      }),
    ).toThrow("persona_state_static_override_forbidden:identity");
  });
});
