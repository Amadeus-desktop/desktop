mod assessment;
mod error;
mod permission;
mod types;

pub use assessment::assess_privacy;
pub use permission::get_screen_capture_permission_status;
pub use types::{
    PrivacyAssessment, PrivacyCheckedContextEvent, PrivacyContext, RedactedContextSnapshot,
    ScreenCapturePermissionStatus, SensitiveReason,
};

pub(crate) use error::CommandError;
