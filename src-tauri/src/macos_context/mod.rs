mod commands;
mod core;

pub use commands::get_current_context_snapshot;
pub use core::{
    AppCategory, CommandError, ContextBridgeState, MacosContextError, MacosContextSnapshot,
};

pub(crate) use core::read_current_snapshot;

#[cfg(test)]
pub(crate) use core::classify_app;

#[cfg(test)]
mod tests;
