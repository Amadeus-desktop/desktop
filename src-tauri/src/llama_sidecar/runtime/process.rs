use std::{
    io::Read,
    net::TcpListener,
    process::{Child, Command, Stdio},
    thread,
    time::Duration,
};

use super::{LlamaSidecarConfig, LlamaSidecarError};

pub(crate) fn spawn_and_wait_until_ready(
    config: &LlamaSidecarConfig,
) -> Result<Child, LlamaSidecarError> {
    ensure_port_available(config)?;

    let mut spawned = Command::new(&config.binary_path)
        .args(config.args())
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()?;

    let mut readiness_error = None;
    for _ in 0..40 {
        thread::sleep(Duration::from_millis(25));
        if let Some(status) = spawned.try_wait()? {
            let stderr = read_child_stderr(&mut spawned);
            let detail = if stderr.is_empty() {
                format!("process exited before readiness with status {status}")
            } else {
                stderr
            };
            return Err(LlamaSidecarError::Readiness(detail));
        }
        match probe_llama_readiness(config) {
            Ok(()) => {
                drain_child_stderr(&mut spawned);
                return Ok(spawned);
            }
            Err(error) => readiness_error = Some(error),
        }
    }

    let _ = spawned.kill();
    let _ = spawned.wait();
    let stderr = read_child_stderr(&mut spawned);
    let detail = if stderr.is_empty() {
        readiness_error.unwrap_or_else(|| "readiness probe timed out".to_string())
    } else {
        stderr
    };
    Err(LlamaSidecarError::Readiness(detail))
}

fn ensure_port_available(config: &LlamaSidecarConfig) -> Result<(), LlamaSidecarError> {
    let address = format!("{}:{}", config.host, config.port);
    TcpListener::bind(&address)
        .map(|listener| drop(listener))
        .map_err(|error| {
            LlamaSidecarError::Readiness(format!(
                "llama sidecar port {address} is unavailable before spawn: {error}"
            ))
        })
}

fn read_child_stderr(child: &mut Child) -> String {
    let mut buffer = String::new();
    if let Some(stderr) = child.stderr.as_mut() {
        let _ = stderr.read_to_string(&mut buffer);
    }
    buffer.trim().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::TcpListener;

    fn test_config(port: u16) -> LlamaSidecarConfig {
        LlamaSidecarConfig {
            binary_path: "/tmp/llama-server".to_string(),
            model_path: "/tmp/model.gguf".to_string(),
            host: "127.0.0.1".to_string(),
            port,
        }
    }

    #[test]
    fn sidecar_spawn_rejects_preoccupied_port() {
        let listener = TcpListener::bind("127.0.0.1:0").expect("test port binds");
        let port = listener.local_addr().expect("local addr").port();

        let result = ensure_port_available(&test_config(port));

        assert!(result.is_err());
    }
}

fn drain_child_stderr(child: &mut Child) {
    if let Some(mut stderr) = child.stderr.take() {
        thread::spawn(move || {
            let mut buffer = [0_u8; 4096];
            while stderr.read(&mut buffer).is_ok_and(|read| read > 0) {}
        });
    }
}

fn probe_llama_readiness(config: &LlamaSidecarConfig) -> Result<(), String> {
    let url = format!("http://{}:{}/completion", config.host, config.port);
    ureq::post(&url)
        .timeout(Duration::from_millis(250))
        .send_json(serde_json::json!({
            "prompt": "health",
            "n_predict": 1,
            "temperature": 0.0,
            "stop": ["\n"],
        }))
        .map(|_| ())
        .map_err(|error| error.to_string())
}
