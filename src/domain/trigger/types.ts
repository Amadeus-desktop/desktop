/** Mirrors Rust `TriggerType` in src-tauri/src/trigger/mod.rs */
export type TriggerType = "deep_pause" | "milestone" | "drift";

export const TRIGGER_TYPES = ["deep_pause", "milestone", "drift"] as const satisfies readonly TriggerType[];
