mod commands;
mod core;

pub use commands::{assess_current_privacy_context, capture_privacy_checked_context_event};
pub use core::{
    assess_privacy, get_screen_capture_permission_status, PrivacyAssessment,
    PrivacyCheckedContextEvent, PrivacyContext, RedactedContextSnapshot,
};

pub(crate) use core::CommandError;

#[cfg(test)]
pub(crate) use core::SensitiveReason;

#[cfg(test)]
mod tests;
