mod bridge;
mod browser;
mod classifier;
mod error;
#[cfg(target_os = "macos")]
mod native_macos;
mod types;

pub use bridge::{ContextBridge, ContextBridgeState};
pub use classifier::classify_app;
pub use error::{CommandError, MacosContextError};
pub use types::{AppCategory, BrowserTabContext, BrowserUrlClass, MacosContextSnapshot};

pub(crate) use bridge::read_current_snapshot;
#[cfg(test)]
pub(crate) use browser::classify_browser_url;
