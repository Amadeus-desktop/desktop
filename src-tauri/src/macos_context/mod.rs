mod commands;
mod core;

pub use commands::get_current_context_snapshot;
pub use core::{
    AppCategory, BrowserTabContext, BrowserUrlClass, CommandError, ContextBridgeState,
    MacosContextError, MacosContextSnapshot,
};

pub(crate) use core::read_current_snapshot;

#[cfg(test)]
pub(crate) use core::{classify_app, classify_browser_url};

#[cfg(test)]
mod tests;
