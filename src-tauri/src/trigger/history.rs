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
    pub(super) fn observe_snapshot_at(
        &mut self,
        snapshot: &MacosContextSnapshot,
        privacy: &PrivacyAssessment,
        observed_at_ms: u128,
    ) {
        let duration_ms = snapshot.frontmost_duration_ms;
        self.foreground_segments.push(ForegroundSegment {
            app_name: snapshot.app_name.clone(),
            bundle_identifier: snapshot.bundle_identifier.clone(),
            category: snapshot.category,
            started_at_ms: observed_at_ms.saturating_sub(duration_ms),
            duration_ms,
            redacted_window_title: privacy.redacted_window_title.clone(),
        });

        self.trim_to_window(observed_at_ms);
        self.recompute_derived_fields();
    }

    fn trim_to_window(&mut self, observed_at_ms: u128) {
        let cutoff_ms = observed_at_ms.saturating_sub(self.window_ms as u128);
        self.foreground_segments
            .retain(|segment| segment.started_at_ms + segment.duration_ms > cutoff_ms);
    }

    fn recompute_derived_fields(&mut self) {
        self.app_switch_count = self
            .foreground_segments
            .windows(2)
            .filter(|pair| pair[0].bundle_identifier != pair[1].bundle_identifier)
            .count() as u32;
        self.work_cluster_duration_ms = self
            .foreground_segments
            .iter()
            .filter(|segment| segment.category == AppCategory::Work)
            .map(|segment| segment.duration_ms)
            .sum();
        self.non_work_single_app_max_duration_ms = self
            .foreground_segments
            .iter()
            .filter(|segment| segment.category != AppCategory::Work)
            .map(|segment| segment.duration_ms)
            .max()
            .unwrap_or(0);
        self.known_meeting_app_frontmost = self
            .foreground_segments
            .last()
            .is_some_and(is_known_meeting_segment);
        self.known_music_app_seen = self.foreground_segments.iter().any(is_known_music_segment);
        self.known_music_app_frontmost_ms = self
            .foreground_segments
            .last()
            .filter(|segment| is_known_music_segment(segment))
            .map(|segment| segment.duration_ms)
            .unwrap_or(0);
    }
}

fn is_known_music_segment(segment: &ForegroundSegment) -> bool {
    let app_name = segment.app_name.to_ascii_lowercase();
    let bundle_identifier = segment.bundle_identifier.to_ascii_lowercase();
    app_name == "music"
        || app_name.contains("spotify")
        || app_name.contains("apple music")
        || bundle_identifier.contains("spotify")
        || bundle_identifier == "com.apple.music"
}

fn is_known_meeting_segment(segment: &ForegroundSegment) -> bool {
    let haystack = format!(
        "{} {} {}",
        segment.app_name, segment.bundle_identifier, segment.redacted_window_title
    )
    .to_ascii_lowercase();
    ["zoom", "meet", "teams", "webex"]
        .iter()
        .any(|keyword| haystack.contains(keyword))
}

pub(super) fn is_known_music_app(snapshot: &MacosContextSnapshot) -> bool {
    let app_name = snapshot.app_name.to_ascii_lowercase();
    let bundle_identifier = snapshot.bundle_identifier.to_ascii_lowercase();
    app_name == "music"
        || app_name.contains("spotify")
        || app_name.contains("apple music")
        || bundle_identifier.contains("spotify")
        || bundle_identifier == "com.apple.music"
}

pub(super) fn is_known_meeting_app(snapshot: &MacosContextSnapshot) -> bool {
    let haystack = format!(
        "{} {} {}",
        snapshot.app_name, snapshot.bundle_identifier, snapshot.window_title
    )
    .to_ascii_lowercase();
    ["zoom", "meet", "teams", "webex"]
        .iter()
        .any(|keyword| haystack.contains(keyword))
}
