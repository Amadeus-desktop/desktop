import type {
  ConversationMessage,
  ConversationSession,
} from "../../timeline/types";
import { getSupabaseClient } from "../../../lib/supabase/client";
import { isCloudPersonaUuid, resolveCloudPersonaId } from "../../memory";

export type CloudConversationRow = {
  id: string;
  user_id: string;
  persona_id: string;
  title: string | null;
  active_surface: "web" | "app" | null;
  summary: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CloudConversationMessageRow = {
  id: string;
  user_id: string;
  conversation_id: string;
  persona_id: string;
  role: "user" | "assistant" | "system_summary";
  content: string;
  provider: string | null;
  surface: "web" | "app";
  source_device_id: string | null;
  local_message_id: string | null;
  idempotency_key: string;
  safety_grade: string;
  client_created_at: string;
  client_sequence: number | null;
  server_received_at: string;
  created_at: string;
};

export type CloudDeviceRow = {
  id: string;
  user_id: string;
  device_label: string | null;
  platform: "macos" | "web" | "other";
  public_install_id: string;
  last_seen_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export type EnsureCloudConversationResult = {
  conversationId: string;
  personaId: string;
};

export type CloudConversationMessageUpsertInput = {
  conversationId: string;
  personaId: string;
  localMessageId: string;
  role: "user" | "assistant" | "system_summary";
  content: string;
  provider?: string | null;
  surface?: "web" | "app";
  sourceDeviceId?: string | null;
  idempotencyKey: string;
  safetyGrade?: "Account";
  clientCreatedAtMs: number;
  clientSequence: number;
};

export type ListCloudConversationMessagesInput = {
  personaId: string;
  sinceServerReceivedAtMs?: number | null;
  limit?: number;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DEVICE_INSTALL_ID_KEY = "amadeus.publicInstallId";

export async function ensureCloudConversationForSession(
  session: ConversationSession,
): Promise<EnsureCloudConversationResult> {
  const personaId = await resolveCloudPersonaId(session.personaId);
  if (!personaId) {
    throw new Error("cloud_persona_not_found");
  }

  if (isCloudUuid(session.cloudConversationId)) {
    return {
      conversationId: session.cloudConversationId,
      personaId,
    };
  }

  const supabase = getSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user?.id) {
    throw userError ?? new Error("supabase_user_missing");
  }

  const cloudConversations = supabase.from("cloud_conversations") as unknown as {
    insert: (payload: Record<string, unknown>) => {
      select: (columns: string) => {
        single: () => Promise<{ data: unknown; error: unknown }>;
      };
    };
  };
  const { data, error } = await cloudConversations
    .insert({
      user_id: userData.user.id,
      persona_id: personaId,
      active_surface: "app",
    })
    .select("id, persona_id")
    .single();

  if (error) throw error;
  const row = data as Pick<CloudConversationRow, "id" | "persona_id">;
  return {
    conversationId: row.id,
    personaId: row.persona_id,
  };
}

export async function getOrCreateCloudDevice(input: {
  publicInstallId?: string;
  deviceLabel?: string | null;
  platform?: "macos" | "web" | "other";
} = {}): Promise<CloudDeviceRow> {
  const supabase = getSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user?.id) {
    throw userError ?? new Error("supabase_user_missing");
  }

  const publicInstallId = input.publicInstallId ?? readOrCreatePublicInstallId();
  const devices = supabase.from("devices") as unknown as {
    upsert: (
      payload: Record<string, unknown>,
      options: Record<string, unknown>,
    ) => {
      select: (columns: string) => {
        single: () => Promise<{ data: unknown; error: unknown }>;
      };
    };
  };
  const { data, error } = await devices
    .upsert(
      {
        user_id: userData.user.id,
        public_install_id: publicInstallId,
        platform: input.platform ?? "macos",
        device_label: input.deviceLabel ?? null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "user_id,public_install_id" },
    )
    .select("*")
    .single();

  if (error) throw error;
  return data as CloudDeviceRow;
}

export async function upsertCloudConversationMessage(
  input: CloudConversationMessageUpsertInput,
): Promise<CloudConversationMessageRow> {
  assertCloudConversationMessageInput(input);
  const supabase = getSupabaseClient();
  const rpcClient = supabase as unknown as {
    rpc: (
      functionName: "upsert_cloud_conversation_message",
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: unknown }>;
  };
  const { data, error } = await rpcClient.rpc("upsert_cloud_conversation_message", {
    p_conversation_id: input.conversationId,
    p_persona_id: input.personaId,
    p_role: input.role,
    p_content: input.content,
    p_provider: input.provider ?? null,
    p_surface: input.surface ?? "app",
    p_source_device_id: input.sourceDeviceId ?? null,
    p_local_message_id: input.localMessageId,
    p_idempotency_key: input.idempotencyKey,
    p_safety_grade: input.safetyGrade ?? "Account",
    p_client_created_at: new Date(input.clientCreatedAtMs).toISOString(),
    p_client_sequence: input.clientSequence,
  });

  if (error) throw error;
  return data as CloudConversationMessageRow;
}

export async function listCloudConversationMessages(
  input: ListCloudConversationMessagesInput,
): Promise<CloudConversationMessageRow[]> {
  const personaId = await resolveCloudPersonaId(input.personaId);
  if (!personaId) return [];

  const supabase = getSupabaseClient();
  let query = supabase
    .from("cloud_conversation_messages")
    .select("*")
    .eq("persona_id", personaId)
    .order("server_received_at", { ascending: true })
    .limit(input.limit ?? 50);

  if (input.sinceServerReceivedAtMs) {
    query = query.gt(
      "server_received_at",
      new Date(input.sinceServerReceivedAtMs).toISOString(),
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CloudConversationMessageRow[];
}

export function localUpsertInputFromCloudMessage(
  row: CloudConversationMessageRow,
): {
  cloudConversationId: string;
  cloudMessageId: string;
  personaId: string;
  role: "user" | "assistant" | "system_summary";
  content: string;
  provider?: string | null;
  idempotencyKey: string;
  clientCreatedAtMs: number;
  clientSequence?: number | null;
  serverReceivedAtMs: number;
} {
  return {
    cloudConversationId: row.conversation_id,
    cloudMessageId: row.id,
    personaId: row.persona_id,
    role: row.role,
    content: row.content,
    provider: row.provider,
    idempotencyKey: row.idempotency_key,
    clientCreatedAtMs: Date.parse(row.client_created_at),
    clientSequence: row.client_sequence,
    serverReceivedAtMs: Date.parse(row.server_received_at),
  };
}

export function cloudMessageUpsertInputFromLocal(
  message: ConversationMessage,
  cloud: EnsureCloudConversationResult,
  sourceDeviceId: string | null,
): CloudConversationMessageUpsertInput {
  return {
    conversationId: cloud.conversationId,
    personaId: cloud.personaId,
    localMessageId: message.id,
    role: message.role,
    content: message.content,
    provider: message.provider ?? null,
    sourceDeviceId,
    idempotencyKey: message.idempotencyKey,
    clientCreatedAtMs: message.createdAtMs,
    clientSequence: message.clientSequence,
  };
}

export function isCloudUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function assertCloudConversationMessageInput(
  input: CloudConversationMessageUpsertInput,
): void {
  if (!isCloudUuid(input.conversationId)) {
    throw new Error("conversation_cloud_conversation_id_invalid");
  }
  if (!isCloudPersonaUuid(input.personaId)) {
    throw new Error("conversation_persona_id_invalid");
  }
  if (!input.localMessageId.trim()) {
    throw new Error("conversation_local_message_id_required");
  }
  if (!input.idempotencyKey.trim()) {
    throw new Error("conversation_idempotency_key_required");
  }
  if (!input.content.trim()) {
    throw new Error("conversation_content_required");
  }
}

function readOrCreatePublicInstallId(): string {
  const globalLocalStorage =
    typeof localStorage === "undefined" ? null : localStorage;
  const existing = globalLocalStorage?.getItem(DEVICE_INSTALL_ID_KEY);
  if (existing) return existing;

  const generated = crypto.randomUUID();
  globalLocalStorage?.setItem(DEVICE_INSTALL_ID_KEY, generated);
  return generated;
}
