use std::time::Instant;

use crate::observability::{info as log_info, LogArea};

pub struct StartupPhaseTimer {
    name: &'static str,
    started_at: Instant,
}

impl StartupPhaseTimer {
    pub fn start(name: &'static str) -> Self {
        Self {
            name,
            started_at: Instant::now(),
        }
    }

    pub fn finish(self) {
        log_info(
            LogArea::Startup,
            format!(
                "startup phase completed: phase={} duration_ms={}",
                self.name,
                self.started_at.elapsed().as_millis()
            ),
        );
    }
}
