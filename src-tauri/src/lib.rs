// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod timeline;

use tauri::Manager;
use timeline::{
    create_context_event, create_user_reaction, create_utterance_event, list_timeline_events,
    TimelineRepository, TimelineState,
};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            let database_path = app_data_dir.join("amadeus.sqlite3");
            let mut repository = TimelineRepository::open(database_path)?;
            repository.migrate()?;
            app.manage(TimelineState::new(repository));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            create_context_event,
            create_utterance_event,
            create_user_reaction,
            list_timeline_events
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
