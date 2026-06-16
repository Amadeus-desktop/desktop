use super::*;
use crate::shared::constants::{MODEL_ROUTE_API_FIRST, MODEL_ROUTE_LOCAL_FIRST};
use std::{
    fs,
    path::PathBuf,
    sync::atomic::{AtomicU64, Ordering},
    time::{SystemTime, UNIX_EPOCH},
};

static SETTINGS_TEST_COUNTER: AtomicU64 = AtomicU64::new(0);

fn temp_settings_path() -> PathBuf {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("clock is valid")
        .as_nanos();
    let counter = SETTINGS_TEST_COUNTER.fetch_add(1, Ordering::Relaxed);
    std::env::temp_dir().join(format!(
        "amadeus-settings-test-{}-{nonce}-{counter}.json",
        std::process::id()
    ))
}

#[test]
fn default_settings_include_local_model_path() {
    let settings = AppSettings::default();

    assert_eq!(settings.locale, "ko");
    assert_eq!(settings.model_route, MODEL_ROUTE_API_FIRST);
    assert_eq!(settings.local_model_path, None);
    assert_eq!(settings.llama_server_binary_path, None);
    assert_eq!(settings.llama_server_host, "127.0.0.1");
    assert_eq!(settings.llama_server_port, 8080);
}

#[test]
fn settings_store_loads_default_when_file_is_missing() {
    let path = temp_settings_path();
    let store = SettingsStore::new(path.clone());

    let settings = store.load().expect("default settings load");

    assert_eq!(settings, AppSettings::default());
    assert!(!path.exists());
}

#[test]
fn settings_store_saves_and_loads_model_path() {
    let path = temp_settings_path();
    let store = SettingsStore::new(path.clone());
    let mut settings = AppSettings::default();
    settings.model_route = MODEL_ROUTE_LOCAL_FIRST.to_string();
    settings.local_model_path = Some("/tmp/model.gguf".to_string());
    settings.llama_server_binary_path = Some("/tmp/llama-server".to_string());

    store.save(&settings).expect("settings save");
    let loaded = store.load().expect("settings reload");

    assert_eq!(loaded.model_route, MODEL_ROUTE_LOCAL_FIRST);
    assert_eq!(loaded.local_model_path.as_deref(), Some("/tmp/model.gguf"));
    assert_eq!(
        loaded.llama_server_binary_path.as_deref(),
        Some("/tmp/llama-server")
    );

    let _ = fs::remove_file(path);
}

#[test]
fn settings_store_migrates_legacy_general_wrapper() {
    let path = temp_settings_path();
    let settings = AppSettings {
        model_route: MODEL_ROUTE_LOCAL_FIRST.to_string(),
        local_model_path: Some("/tmp/model.gguf".to_string()),
        ..AppSettings::default()
    };
    let legacy = serde_json::json!({ "general": settings });
    fs::write(
        &path,
        serde_json::to_string_pretty(&legacy).expect("legacy json"),
    )
    .expect("legacy settings written");
    let store = SettingsStore::new(path.clone());

    let loaded = store.load().expect("legacy settings load");
    let migrated: serde_json::Value =
        serde_json::from_str(&fs::read_to_string(&path).expect("settings file"))
            .expect("migrated json");

    assert_eq!(loaded.model_route, MODEL_ROUTE_LOCAL_FIRST);
    assert!(migrated.get("general").is_none());
    assert_eq!(
        migrated.get("modelRoute").and_then(|value| value.as_str()),
        Some(MODEL_ROUTE_LOCAL_FIRST)
    );

    let _ = fs::remove_file(path);
}

#[test]
fn settings_store_migrates_legacy_persona_id() {
    let path = temp_settings_path();
    let settings = AppSettings {
        companion_persona_id: "nature_healing".to_string(),
        ..AppSettings::default()
    };
    fs::write(
        &path,
        serde_json::to_string_pretty(&settings).expect("settings json"),
    )
    .expect("settings file written");
    let store = SettingsStore::new(path.clone());

    let loaded = store.load().expect("legacy persona settings load");
    let migrated: serde_json::Value =
        serde_json::from_str(&fs::read_to_string(&path).expect("settings file"))
            .expect("migrated json");

    assert_eq!(loaded.companion_persona_id, "soft_care");
    assert_eq!(
        migrated
            .get("companionPersonaId")
            .and_then(|value| value.as_str()),
        Some("soft_care")
    );

    let _ = fs::remove_file(path);
}

#[test]
fn builds_llama_endpoint_from_settings_host_and_port() {
    assert_eq!(llama_endpoint("127.0.0.1", 8080), "http://127.0.0.1:8080");
}

#[test]
fn settings_store_rejects_invalid_model_route() {
    let path = temp_settings_path();
    let store = SettingsStore::new(path.clone());
    let state = SettingsState::new_for_test(store, AppSettings::default());
    let mut settings = AppSettings::default();
    settings.model_route = "invalid".to_string();

    assert!(state.update(settings).is_err());
    assert!(!path.exists());
}

#[test]
fn settings_store_rejects_non_localhost_llama_host() {
    let path = temp_settings_path();
    let store = SettingsStore::new(path.clone());
    let state = SettingsState::new_for_test(store, AppSettings::default());
    let settings = AppSettings {
        llama_server_host: "0.0.0.0".to_string(),
        ..AppSettings::default()
    };

    assert!(state.update(settings).is_err());
    assert!(!path.exists());
}

#[test]
fn settings_store_rejects_non_localhost_host_on_load() {
    let path = temp_settings_path();
    let settings = AppSettings {
        llama_server_host: "0.0.0.0".to_string(),
        ..AppSettings::default()
    };
    fs::write(
        &path,
        serde_json::to_string_pretty(&settings).expect("settings json"),
    )
    .expect("settings file written");
    let store = SettingsStore::new(path.clone());

    let result = store.load();

    assert!(result.is_err());
    let _ = fs::remove_file(path);
}

#[test]
fn settings_store_recovers_from_corrupt_json_with_backup() {
    let path = temp_settings_path();
    fs::write(&path, "{").expect("corrupt settings file written");
    let backup_path = path.with_extension("json.invalid");
    let store = SettingsStore::new(path.clone());

    let settings = store.load().expect("corrupt settings recovers");

    assert_eq!(settings, AppSettings::default());
    assert!(!path.exists());
    assert_eq!(fs::read_to_string(&backup_path).expect("backup file"), "{");

    let _ = fs::remove_file(path);
    let _ = fs::remove_file(backup_path);
}
