use rusqlite::Connection;

use super::TimelineError;

const LOCAL_TIMELINE_SCHEMA_SQL: &str =
    include_str!("../migrations/local/0000_local_timeline_core.sql");

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum LocalSchemaEnvironment {
    Development,
    Production,
}

pub(crate) fn local_schema_environment_from_env() -> LocalSchemaEnvironment {
    match std::env::var("AMADEUS_LOCAL_SCHEMA_ENV")
        .unwrap_or_default()
        .to_ascii_lowercase()
        .as_str()
    {
        "dev" | "development" => LocalSchemaEnvironment::Development,
        "prod" | "production" => LocalSchemaEnvironment::Production,
        _ if cfg!(debug_assertions) => LocalSchemaEnvironment::Development,
        _ => LocalSchemaEnvironment::Production,
    }
}

pub(crate) fn local_schema_sql_for_environment(
    environment: LocalSchemaEnvironment,
) -> &'static str {
    match environment {
        LocalSchemaEnvironment::Development => LOCAL_TIMELINE_SCHEMA_SQL,
        LocalSchemaEnvironment::Production => LOCAL_TIMELINE_SCHEMA_SQL,
    }
}

pub(crate) fn apply_local_schema(
    connection: &Connection,
    environment: LocalSchemaEnvironment,
) -> Result<(), TimelineError> {
    connection.execute_batch(local_schema_sql_for_environment(environment))?;
    ensure_local_persona_columns(connection)?;
    ensure_local_memory_card_columns(connection)?;
    connection.execute_batch(
        "CREATE INDEX IF NOT EXISTS local_memories_persona_scope_idx
          ON local_memories (persona_id, scope, memory_category, confidence DESC, updated_at_ms DESC)
          WHERE deleted_at_ms IS NULL;",
    )?;
    Ok(())
}

fn ensure_local_persona_columns(connection: &Connection) -> Result<(), TimelineError> {
    add_column_if_missing(
        connection,
        "local_personas",
        "slug",
        "slug TEXT NOT NULL DEFAULT 'unknown-persona'",
    )?;
    Ok(())
}

fn ensure_local_memory_card_columns(connection: &Connection) -> Result<(), TimelineError> {
    add_column_if_missing(
        connection,
        "local_memories",
        "memory_category",
        "memory_category TEXT NOT NULL DEFAULT 'semantic' CHECK (memory_category IN ('semantic', 'episodic', 'procedural'))",
    )?;
    add_column_if_missing(
        connection,
        "local_memories",
        "source",
        "source TEXT NOT NULL DEFAULT 'conversation' CHECK (source IN ('conversation', 'nudge_reaction', 'desktop_context', 'manual'))",
    )?;
    add_column_if_missing(
        connection,
        "local_memories",
        "normalized_key",
        "normalized_key TEXT",
    )?;
    add_column_if_missing(
        connection,
        "local_memories",
        "source_message_ids_json",
        "source_message_ids_json TEXT NOT NULL DEFAULT '[]'",
    )?;
    add_column_if_missing(
        connection,
        "local_memories",
        "evidence_excerpt_redacted",
        "evidence_excerpt_redacted TEXT",
    )?;
    add_column_if_missing(
        connection,
        "local_memories",
        "observed_at_ms",
        "observed_at_ms INTEGER",
    )?;
    add_column_if_missing(
        connection,
        "local_memories",
        "valid_from_ms",
        "valid_from_ms INTEGER",
    )?;
    add_column_if_missing(
        connection,
        "local_memories",
        "expires_at_ms",
        "expires_at_ms INTEGER",
    )?;
    add_column_if_missing(
        connection,
        "local_memories",
        "user_confirmed",
        "user_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (user_confirmed IN (0, 1))",
    )?;
    add_column_if_missing(
        connection,
        "local_memories",
        "contradicts_memory_id",
        "contradicts_memory_id TEXT",
    )?;
    add_column_if_missing(
        connection,
        "local_memories",
        "write_reason",
        "write_reason TEXT NOT NULL DEFAULT 'legacy_local_memory'",
    )?;
    add_column_if_missing(
        connection,
        "local_memories",
        "deleted_at_ms",
        "deleted_at_ms INTEGER",
    )?;
    add_column_if_missing(
        connection,
        "local_memories",
        "metadata_json",
        "metadata_json TEXT NOT NULL DEFAULT '{}'",
    )?;
    Ok(())
}

fn add_column_if_missing(
    connection: &Connection,
    table_name: &str,
    column_name: &str,
    column_definition: &str,
) -> Result<(), TimelineError> {
    if column_exists(connection, table_name, column_name)? {
        return Ok(());
    }
    connection.execute_batch(&format!(
        "ALTER TABLE {table_name} ADD COLUMN {column_definition};"
    ))?;
    Ok(())
}

fn column_exists(
    connection: &Connection,
    table_name: &str,
    column_name: &str,
) -> Result<bool, TimelineError> {
    Ok(table_columns(connection, table_name)?
        .iter()
        .any(|column| column == column_name))
}

fn table_columns(connection: &Connection, table_name: &str) -> Result<Vec<String>, TimelineError> {
    let mut statement = connection.prepare(&format!("PRAGMA table_info({table_name})"))?;
    let rows = statement.query_map([], |row| row.get::<_, String>(1))?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(TimelineError::from)
}
