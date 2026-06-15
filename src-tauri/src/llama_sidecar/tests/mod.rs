use super::*;
use crate::settings::AppSettings;
use std::{
    collections::HashSet,
    fs,
    net::TcpListener,
    os::unix::fs::PermissionsExt,
    path::{Path, PathBuf},
    sync::atomic::{AtomicU64, Ordering},
    time::{SystemTime, UNIX_EPOCH},
};

static TEMP_PATH_COUNTER: AtomicU64 = AtomicU64::new(0);

fn temp_nonce() -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("clock is valid")
        .as_nanos();
    let counter = TEMP_PATH_COUNTER.fetch_add(1, Ordering::Relaxed);
    format!("{nanos}-{counter}")
}

fn temp_file(name: &str) -> String {
    let nonce = temp_nonce();
    let path = std::env::temp_dir().join(format!("amadeus-{name}-{nonce}"));
    fs::write(&path, b"test").expect("temp file is written");
    path.to_string_lossy().to_string()
}

fn temp_dir(name: &str) -> PathBuf {
    let nonce = temp_nonce();
    let path = std::env::temp_dir().join(format!("amadeus-{name}-{nonce}"));
    fs::create_dir_all(&path).expect("temp dir is created");
    path
}

fn executable_script(dir: &Path, name: &str, body: &str) -> String {
    let path = dir.join(name);
    fs::write(&path, body).expect("script is written");
    let mut permissions = fs::metadata(&path).expect("script metadata").permissions();
    permissions.set_mode(0o755);
    fs::set_permissions(&path, permissions).expect("script is executable");
    path.to_string_lossy().to_string()
}

fn unused_local_port() -> u16 {
    let listener = TcpListener::bind("127.0.0.1:0").expect("ephemeral port binds");
    listener.local_addr().expect("local addr").port()
}

#[test]
fn temp_dirs_are_unique_under_fast_creation() {
    let mut paths = HashSet::new();

    for _ in 0..128 {
        let path = temp_dir("sidecars");
        assert!(paths.insert(path.clone()));
        let _ = fs::remove_dir_all(path);
    }
}

#[test]
fn sidecar_config_builds_llama_server_args() {
    let binary_dir = temp_dir("sidecars");
    let binary_path = binary_dir.join("llama-server");
    fs::write(&binary_path, b"test").expect("binary file is written");
    let binary_path = binary_path.to_string_lossy().to_string();
    let model_path = temp_file("model.gguf");
    let mut settings = AppSettings::default();
    settings.llama_server_binary_path = Some(binary_path.clone());
    settings.local_model_path = Some(model_path.clone());

    let config = LlamaSidecarConfig::from_settings(&settings, &binary_dir).expect("valid config");

    assert_eq!(
        config.binary_path,
        fs::canonicalize(&binary_path)
            .expect("binary path canonicalizes")
            .to_string_lossy()
            .to_string()
    );
    assert_eq!(
        config.args(),
        vec![
            "--model".to_string(),
            model_path.clone(),
            "--host".to_string(),
            "127.0.0.1".to_string(),
            "--port".to_string(),
            "8080".to_string(),
            "--ctx-size".to_string(),
            "2048".to_string(),
        ]
    );
    let _ = fs::remove_dir_all(binary_dir);
    let _ = fs::remove_file(model_path);
}

#[test]
fn sidecar_config_requires_binary_and_model_paths() {
    let settings = AppSettings::default();
    let binary_dir = temp_dir("sidecars");

    assert!(LlamaSidecarConfig::from_settings(&settings, &binary_dir).is_err());
    let _ = fs::remove_dir_all(binary_dir);
}

#[test]
fn sidecar_config_rejects_binary_outside_allowed_dir() {
    let binary_dir = temp_dir("sidecars");
    let binary_path = temp_file("outside-llama-server");
    let model_path = temp_file("model.gguf");
    let mut settings = AppSettings::default();
    settings.llama_server_binary_path = Some(binary_path.clone());
    settings.local_model_path = Some(model_path.clone());

    assert!(LlamaSidecarConfig::from_settings(&settings, &binary_dir).is_err());

    let _ = fs::remove_dir_all(binary_dir);
    let _ = fs::remove_file(binary_path);
    let _ = fs::remove_file(model_path);
}

#[test]
fn sidecar_config_rejects_non_localhost_host() {
    let binary_dir = temp_dir("sidecars");
    let binary_path = executable_script(&binary_dir, "llama-server", "#!/bin/sh\nsleep 10\n");
    let model_path = temp_file("model.gguf");
    let mut settings = AppSettings::default();
    settings.llama_server_binary_path = Some(binary_path);
    settings.local_model_path = Some(model_path.clone());
    settings.llama_server_host = "0.0.0.0".to_string();

    let result = LlamaSidecarConfig::from_settings(&settings, &binary_dir);

    assert!(result.is_err());
    let _ = fs::remove_dir_all(binary_dir);
    let _ = fs::remove_file(model_path);
}

#[test]
fn invalid_reconfigure_keeps_existing_config() {
    let binary_dir = temp_dir("sidecars");
    let binary_path = executable_script(&binary_dir, "llama-server", "#!/bin/sh\nsleep 10\n");
    let model_path = temp_file("model.gguf");
    let outside_binary_path = temp_file("outside-llama-server");
    let mut settings = AppSettings::default();
    settings.llama_server_binary_path = Some(binary_path);
    settings.local_model_path = Some(model_path.clone());
    let state = LlamaSidecarState::new(binary_dir.clone());
    state.configure(&settings).expect("initial config is valid");

    let mut invalid = settings.clone();
    invalid.llama_server_binary_path = Some(outside_binary_path.clone());

    assert!(state.configure(&invalid).is_err());
    assert!(state.status().configured);

    let _ = fs::remove_dir_all(binary_dir);
    let _ = fs::remove_file(model_path);
    let _ = fs::remove_file(outside_binary_path);
}

#[test]
fn sidecar_readiness_requires_http_endpoint() {
    let binary_dir = temp_dir("sidecars");
    let binary_path = executable_script(&binary_dir, "llama-server", "#!/bin/sh\nsleep 2\n");
    let model_path = temp_file("model.gguf");
    let mut settings = AppSettings::default();
    settings.llama_server_binary_path = Some(binary_path);
    settings.local_model_path = Some(model_path.clone());
    settings.llama_server_port = unused_local_port();
    let state = LlamaSidecarState::new(binary_dir.clone());

    state.configure(&settings).expect("sidecar config is valid");
    let result = state.ensure_running();

    assert!(result.is_err());
    assert!(!state.status().running);

    let _ = fs::remove_dir_all(binary_dir);
    let _ = fs::remove_file(model_path);
}

#[test]
fn sidecar_readiness_failure_records_stderr_status() {
    let binary_dir = temp_dir("sidecars");
    let binary_path = executable_script(
        &binary_dir,
        "llama-server",
        "#!/bin/sh\necho 'llama boot failed' >&2\nexit 42\n",
    );
    let model_path = temp_file("model.gguf");
    let mut settings = AppSettings::default();
    settings.llama_server_binary_path = Some(binary_path);
    settings.local_model_path = Some(model_path.clone());
    settings.llama_server_port = unused_local_port();
    let state = LlamaSidecarState::new(binary_dir.clone());

    state.configure(&settings).expect("sidecar config is valid");
    let error = state
        .ensure_running()
        .expect_err("sidecar exits during readiness check");
    let status = state.status();

    assert!(error.to_string().contains("llama boot failed"));
    assert!(status.configured);
    assert!(!status.running);
    assert!(status.detail.contains("llama boot failed"));

    let _ = fs::remove_dir_all(binary_dir);
    let _ = fs::remove_file(model_path);
}
