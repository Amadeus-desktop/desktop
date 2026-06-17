import { describe, expect, it, vi } from "vitest";
import type {
  CloudPersonaSnapshot,
  LocalPersonaCache,
} from "../../../domain/persona";
import { syncCloudPersonasToLocalCache } from "./personaCacheRepository";

const remote: CloudPersonaSnapshot = {
  remotePersonaId: "remote-1",
  slug: "makise-kurisu",
  name: "마키세 크리스",
  baseTone: "logical_tsundere",
  relationshipType: "lab_partner",
  worldType: "sci_fi_modern",
  staticPromptJson: { identity: { name: "마키세 크리스" } },
  personaStateJson: {
    relationship_stage: "argumentative_lab_partner",
    affinity: 26,
    trust_state: "stable",
    recent_mood: null,
    open_loops: [],
    last_major_event: null,
    boundary_overrides: {},
    state_source: "system",
    version: 1,
  },
  version: 2,
  updatedAtMs: 1_797_398_400_000,
  deletedAt: null,
};

describe("syncCloudPersonasToLocalCache", () => {
  it("bootstraps, pulls, merges, and writes local persona cache", async () => {
    const bootstrapUserPersonas = vi.fn().mockResolvedValue(undefined);
    const pullCloudPersonas = vi.fn().mockResolvedValue([remote]);
    const listLocalPersonas = vi.fn().mockResolvedValue([]);
    const upsertLocalPersonas = vi
      .fn()
      .mockImplementation(async (personas: LocalPersonaCache[]) => personas);

    const result = await syncCloudPersonasToLocalCache({
      bootstrapUserPersonas,
      pullCloudPersonas,
      listLocalPersonas,
      upsertLocalPersonas,
    });

    expect(bootstrapUserPersonas).toHaveBeenCalledOnce();
    expect(pullCloudPersonas).toHaveBeenCalledOnce();
    expect(upsertLocalPersonas).toHaveBeenCalledWith([
      expect.objectContaining({
        remotePersonaId: "remote-1",
        slug: "makise-kurisu",
        name: "마키세 크리스",
        syncStatus: "synced",
      }),
    ]);
    expect(result).toHaveLength(1);
  });

  it("keeps unchanged local personas in the returned cache list", async () => {
    const existing: LocalPersonaCache = {
      id: "remote-2",
      remotePersonaId: "remote-2",
      slug: "seoyeon-modern-senior",
      name: "한서연",
      baseTone: "restrained_warm",
      relationshipType: "ex_lover_senior",
      worldType: "modern_romance",
      staticPromptJson: "{}",
      personaStateJson: null,
      remoteVersion: 1,
      lastPulledVersion: 1,
      pendingMutationId: null,
      syncStatus: "synced",
      updatedAtMs: 1_797_398_300_000,
    };
    const bootstrapUserPersonas = vi.fn().mockResolvedValue(undefined);
    const pullCloudPersonas = vi.fn().mockResolvedValue([remote]);
    const listLocalPersonas = vi.fn().mockResolvedValue([existing]);
    const upsertLocalPersonas = vi
      .fn()
      .mockImplementation(async (personas: LocalPersonaCache[]) => personas);

    const result = await syncCloudPersonasToLocalCache({
      bootstrapUserPersonas,
      pullCloudPersonas,
      listLocalPersonas,
      upsertLocalPersonas,
    });

    expect(result.map((persona) => persona.slug).sort()).toEqual([
      "makise-kurisu",
      "seoyeon-modern-senior",
    ]);
  });

  it("matches an existing local cache by slug when the remote persona id changes", async () => {
    const existing: LocalPersonaCache = {
      id: "old-remote-1",
      remotePersonaId: "old-remote-1",
      slug: "makise-kurisu",
      name: "마키세 크리스",
      baseTone: "logical_tsundere",
      relationshipType: "lab_partner",
      worldType: "sci_fi_modern",
      staticPromptJson: "{}",
      personaStateJson: null,
      remoteVersion: 1,
      lastPulledVersion: 1,
      pendingMutationId: null,
      syncStatus: "synced",
      updatedAtMs: 1_797_398_300_000,
    };
    const bootstrapUserPersonas = vi.fn().mockResolvedValue(undefined);
    const pullCloudPersonas = vi.fn().mockResolvedValue([remote]);
    const listLocalPersonas = vi.fn().mockResolvedValue([existing]);
    const upsertLocalPersonas = vi
      .fn()
      .mockImplementation(async (personas: LocalPersonaCache[]) => personas);

    const result = await syncCloudPersonasToLocalCache({
      bootstrapUserPersonas,
      pullCloudPersonas,
      listLocalPersonas,
      upsertLocalPersonas,
    });

    expect(upsertLocalPersonas).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "remote-1",
        remotePersonaId: "remote-1",
        slug: "makise-kurisu",
      }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      remotePersonaId: "remote-1",
      slug: "makise-kurisu",
    });
  });
});
