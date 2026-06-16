import { getSupabaseClient } from "../../../lib/supabase/client";

const BOOTSTRAP_USER_PERSONAS_FUNCTION = "bootstrap-user-personas";

export async function bootstrapUserPersonas(): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.functions.invoke(
    BOOTSTRAP_USER_PERSONAS_FUNCTION,
    { body: {} },
  );

  if (error) {
    throw error;
  }
}
