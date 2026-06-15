export type PersonaStaticPromptJson = {
  identity: Record<string, unknown>;
  backstory?: Record<string, unknown>;
  speech_style?: Record<string, unknown>;
  scenario?: Record<string, unknown>;
  first_message?: string;
  example_dialogues?: string[];
  world_lore?: Record<string, unknown>;
  opening_state?: Record<string, unknown>;
  relationship_boundary?: Record<string, unknown>;
  warmth_level?: number;
  humor_level?: number;
  forbidden_claims?: string[];
  negative_behavior?: string[];
  safety_boundary?: Record<string, unknown>;
  privacy_contract?: Record<string, unknown>;
  creator_notes?: string;
  creator_visibility?: "private" | "public" | string;
  [key: string]: unknown;
};

export type PersonaStateJson = {
  relationship_stage: string;
  affinity: number;
  trust_state: "stable" | "strained" | "repair_needed" | string;
  recent_mood?: string | null;
  open_loops: unknown[];
  last_major_event?: string | null;
  boundary_overrides: Record<string, unknown>;
  state_source: "conversation" | "explicit_user_edit" | "system" | string;
  version: number;
  expires_at?: string | null;
};

export type CloudPersonaSnapshot = {
  remotePersonaId: string;
  name: string;
  baseTone: string;
  relationshipType: string;
  worldType: string;
  staticPromptJson: PersonaStaticPromptJson;
  personaStateJson: PersonaStateJson | null;
  version: number;
  updatedAtMs: number;
  deletedAt: string | null;
};

export type PersonaSyncStatus =
  | "synced"
  | "pending"
  | "conflicted"
  | "deleted";

export type LocalPersonaCache = {
  id: string;
  remotePersonaId: string;
  name: string;
  baseTone: string;
  relationshipType: string;
  worldType: string;
  staticPromptJson: string;
  personaStateJson: string | null;
  remoteVersion: number;
  lastPulledVersion: number;
  pendingMutationId: string | null;
  syncStatus: PersonaSyncStatus;
  updatedAtMs: number;
};

export type PersonaCacheDecision =
  | {
      action: "insert" | "replace" | "keep";
      cache: LocalPersonaCache;
    }
  | {
      action: "conflict";
      cache: LocalPersonaCache;
      remote: CloudPersonaSnapshot;
    };

export function buildLocalPersonaCache(
  remote: CloudPersonaSnapshot,
): LocalPersonaCache {
  return {
    id: remote.remotePersonaId,
    remotePersonaId: remote.remotePersonaId,
    name: remote.name,
    baseTone: remote.baseTone,
    relationshipType: remote.relationshipType,
    worldType: remote.worldType,
    staticPromptJson: JSON.stringify(remote.staticPromptJson),
    personaStateJson: remote.personaStateJson
      ? JSON.stringify(remote.personaStateJson)
      : null,
    remoteVersion: remote.version,
    lastPulledVersion: remote.version,
    pendingMutationId: null,
    syncStatus: remote.deletedAt ? "deleted" : "synced",
    updatedAtMs: remote.updatedAtMs,
  };
}

export function mergeRemotePersonaCache(
  local: LocalPersonaCache | null,
  remote: CloudPersonaSnapshot,
): PersonaCacheDecision {
  const nextCache = buildLocalPersonaCache(remote);
  if (!local) {
    return { action: "insert", cache: nextCache };
  }

  if (local.pendingMutationId) {
    if (remote.version > local.remoteVersion) {
      return {
        action: "conflict",
        cache: {
          ...local,
          syncStatus: "conflicted",
          lastPulledVersion: Math.max(local.lastPulledVersion, remote.version),
        },
        remote,
      };
    }
    return { action: "keep", cache: local };
  }

  if (remote.version > local.remoteVersion) {
    return { action: "replace", cache: nextCache };
  }

  return { action: "keep", cache: local };
}

export function assertPersonaStateCannotOverwriteStaticIdentity(
  state: PersonaStateJson,
): void {
  const forbiddenKeys = [
    "identity",
    "backstory",
    "speech_style",
    "scenario",
    "first_message",
    "world_lore",
    "relationship_boundary",
    "forbidden_claims",
    "negative_behavior",
    "safety_boundary",
    "privacy_contract",
  ];
  for (const key of forbiddenKeys) {
    if (key in state.boundary_overrides) {
      throw new Error(`persona_state_static_override_forbidden:${key}`);
    }
  }
}
