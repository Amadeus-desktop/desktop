use std::sync::Mutex;

use super::TimelineRepository;

pub struct TimelineState {
    repository: Mutex<TimelineRepository>,
}

impl TimelineState {
    pub fn new(repository: TimelineRepository) -> Self {
        Self {
            repository: Mutex::new(repository),
        }
    }

    pub fn repository(&self) -> &Mutex<TimelineRepository> {
        &self.repository
    }
}
