import type {
  CloudPersonaSnapshot,
  PersonaStateJson,
  PersonaStaticPromptJson,
} from "../../../domain/persona";
import { getSupabaseClient } from "../../../lib/supabase/client";

type PersonaRow = {
  id: string;
  slug: string;
  name: string;
  base_tone: string;
  relationship_type: string;
  world_type: string;
  static_prompt_json: PersonaStaticPromptJson;
  version: number;
  updated_at: string;
  deleted_at: string | null;
  persona_states?: PersonaStateRow[] | null;
};

type PersonaStateRow = {
  relationship_stage: string;
  affinity: number;
  trust_state: string;
  recent_mood: string | null;
  open_loops: unknown[];
  last_major_event: string | null;
  boundary_overrides: Record<string, unknown>;
  state_source: string;
  version: number;
  expires_at: string | null;
};

const PERSONA_SELECT = [
  "id",
  "slug",
  "name",
  "base_tone",
  "relationship_type",
  "world_type",
  "static_prompt_json",
  "version",
  "updated_at",
  "deleted_at",
  "persona_states(relationship_stage, affinity, trust_state, recent_mood, open_loops, last_major_event, boundary_overrides, state_source, version, expires_at)",
].join(", ");

export async function pullCloudPersonas(): Promise<CloudPersonaSnapshot[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("personas")
    .select(PERSONA_SELECT)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => normalizePersonaRow(row as PersonaRow));
}

export async function updateCloudPersonaWithVersion(input: {
  personaId: string;
  slug?: string;
  expectedVersion: number;
  name: string;
  baseTone: string;
  relationshipType: string;
  worldType: string;
  staticPromptJson: PersonaStaticPromptJson;
}): Promise<CloudPersonaSnapshot> {
  const supabase = getSupabaseClient();
  const rpcClient = supabase as unknown as {
    rpc: (
      functionName: "update_persona_with_version",
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: unknown }>;
  };
  const { data, error } = await rpcClient.rpc("update_persona_with_version", {
    p_persona_id: input.personaId,
    p_expected_version: input.expectedVersion,
    p_name: input.name,
    p_base_tone: input.baseTone,
    p_relationship_type: input.relationshipType,
    p_world_type: input.worldType,
    p_static_prompt_json: input.staticPromptJson,
    p_slug: "slug" in input ? input.slug : null,
  });

  if (error) {
    throw error;
  }

  return normalizePersonaRow(data as PersonaRow);
}

export function normalizePersonaRow(row: PersonaRow): CloudPersonaSnapshot {
  const state = Array.isArray(row.persona_states)
    ? row.persona_states[0]
    : null;

  return {
    remotePersonaId: row.id,
    slug: row.slug,
    name: row.name,
    baseTone: row.base_tone,
    relationshipType: row.relationship_type,
    worldType: row.world_type,
    staticPromptJson: row.static_prompt_json,
    personaStateJson: state ? normalizePersonaStateRow(state) : null,
    version: row.version,
    updatedAtMs: Date.parse(row.updated_at),
    deletedAt: row.deleted_at,
  };
}

function normalizePersonaStateRow(row: PersonaStateRow): PersonaStateJson {
  return {
    relationship_stage: row.relationship_stage,
    affinity: row.affinity,
    trust_state: row.trust_state,
    recent_mood: row.recent_mood,
    open_loops: row.open_loops,
    last_major_event: row.last_major_event,
    boundary_overrides: row.boundary_overrides,
    state_source: row.state_source,
    version: row.version,
    expires_at: row.expires_at,
  };
}
