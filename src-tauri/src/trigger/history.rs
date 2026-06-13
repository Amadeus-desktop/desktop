use serde::Serialize;

use crate::{
    macos_context::{AppCategory, MacosContextSnapshot},
    privacy::PrivacyAssessment,
};

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ForegroundSegment {
    pub app_name: String,
    pub bundle_identifier: String,
    pub category: AppCategory,
    pub started_at_ms: u128,
    pub duration_ms: u128,
    pub redacted_window_title: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessHistoryWindow {
    pub window_ms: u64,
    pub foreground_segments: Vec<ForegroundSegment>,
    pub app_switch_count: u32,
    pub work_cluster_duration_ms: u128,
    pub non_work_single_app_max_duration_ms: u128,
    pub known_meeting_app_frontmost: bool,
    pub known_music_app_seen: bool,
    pub known_music_app_frontmost_ms: u128,
}

impl Default for ProcessHistoryWindow {
    fn default() -> Self {
        Self {
            window_ms: 10 * 60 * 1000,
            foreground_segments: Vec::new(),
            app_switch_count: 0,
            work_cluster_duration_ms: 0,
            non_work_single_app_max_duration_ms: 0,
            known_meeting_app_frontmost: false,
            known_music_app_seen: false,
            known_music_app_frontmost_ms: 0,
        }
    }
}

impl ProcessHistoryWindow {
    pub(super) fn observe_snapshot(
        &mut self,
        snapshot: &MacosContextSnapshot,
        privacy: &PrivacyAssessment,
    ) {
        if self
            .foreground_segments
            .last()
            .is_some_and(|segment| segment.bundle_identifier != snapshot.bundle_identifier)
        {
            self.app_switch_count += 1;
        }

        let duration_ms = snapshot.frontmost_duration_ms;
        self.foreground_segments.push(ForegroundSegment {
            app_name: snapshot.app_name.clone(),
            bundle_identifier: snapshot.bundle_identifier.clone(),
            category: snapshot.category,
            started_at_ms: 0,
            duration_ms,
            redacted_window_title: privacy.redacted_window_title.clone(),
        });
        if self.foreground_segments.len() > 20 {
            self.foreground_segments.remove(0);
        }

        if snapshot.category == AppCategory::Work {
            self.work_cluster_duration_ms = self.work_cluster_duration_ms.max(duration_ms);
        } else {
            self.non_work_single_app_max_duration_ms =
                self.non_work_single_app_max_duration_ms.max(duration_ms);
        }

        if is_known_meeting_app(snapshot) {
            self.known_meeting_app_frontmost = true;
        }
        if is_known_music_app(snapshot) {
            self.known_music_app_seen = true;
            self.known_music_app_frontmost_ms = duration_ms;
        }
    }
}

pub(super) fn is_known_music_app(snapshot: &MacosContextSnapshot) -> bool {
    let haystack = app_haystack(snapshot);
    ["spotify", "music", "com.apple.music"]
        .iter()
        .any(|keyword| haystack.contains(keyword))
}

pub(super) fn is_known_meeting_app(snapshot: &MacosContextSnapshot) -> bool {
    let haystack = app_haystack(snapshot);
    ["zoom", "meet", "teams", "webex"]
        .iter()
        .any(|keyword| haystack.contains(keyword))
}

fn app_haystack(snapshot: &MacosContextSnapshot) -> String {
    format!("{} {}", snapshot.app_name, snapshot.bundle_identifier).to_ascii_lowercase()
}
