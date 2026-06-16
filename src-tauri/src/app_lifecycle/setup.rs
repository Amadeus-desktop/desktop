#[cfg(not(target_os = "macos"))]
use crate::macos_window::position_companion_window;
#[cfg(target_os = "macos")]
use crate::macos_window::{
    configure_macos_companion_window, configure_macos_main_window,
    restore_companion_window_on_active_space, schedule_macos_webview_layer_refresh,
    watch_macos_companion_space_changes,
};
use crate::{
    app_lifecycle::{
        auth_callback::start_dev_auth_callback_server,
        frontend_ready::FrontendLifecycleState,
        resident_windows::{watch_companion_window_layout, watch_resident_window_close},
        startup::StartupPhaseTimer,
        tray::setup_menu_bar,
    },
    llama_sidecar::LlamaSidecarState,
    llm::{LlmService, LlmState},
    macos_context::ContextBridgeState,
    macos_window::CompanionWindowVisibility,
    observability::{error as log_error, info as log_info, init as init_logger, LogArea},
    ocr::{OcrState, ScreenCaptureState},
    settings::{llama_endpoint, SettingsState},
    shared::constants::{APP_DATABASE_FILE_NAME, APP_LOG_FILE_NAME, APP_SETTINGS_FILE_NAME},
    timeline::{TimelineRepository, TimelineState},
    trigger::TriggerEngineState,
};
use tauri::Manager;

pub fn setup_app(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let setup_timer = StartupPhaseTimer::start("setup_total");
    let phase = StartupPhaseTimer::start("path_resolution");
    let app_data_dir = app.path().app_data_dir()?;
    phase.finish();
    let phase = StartupPhaseTimer::start("logger_init");
    if let Err(error) = init_logger(app_data_dir.join(APP_LOG_FILE_NAME)) {
        eprintln!("[amadeus][warn][observability] logger init failed: {error}");
    }
    phase.finish();
    log_info(LogArea::Startup, "startup setup entered");
    let phase = StartupPhaseTimer::start("state_path_resolution");
    let database_path = app_data_dir.join(APP_DATABASE_FILE_NAME);
    let settings_path = app_data_dir.join(APP_SETTINGS_FILE_NAME);
    phase.finish();
    let phase = StartupPhaseTimer::start("timeline_repository_open_and_migrate");
    let mut repository = TimelineRepository::open(database_path)?;
    repository.migrate()?;
    phase.finish();
    let phase = StartupPhaseTimer::start("settings_load");
    let settings_state = SettingsState::open(settings_path)?;
    let settings = settings_state.current()?;
    phase.finish();
    let phase = StartupPhaseTimer::start("llm_state_configure");
    let llm_state = LlmState::new(LlmService::default());
    let sidecar_state = LlamaSidecarState::new(app_data_dir.join("sidecars"));
    let _ = sidecar_state.configure(&settings);
    let start_sidecar = settings.model_route == "local-first";
    llm_state.configure_local(
        llama_endpoint(&settings.llama_server_host, settings.llama_server_port),
        settings.local_model_path.clone(),
    )?;
    llm_state.set_route(&settings.model_route, settings.local_fallback_enabled)?;
    phase.finish();
    let phase = StartupPhaseTimer::start("tauri_state_manage");
    app.manage(TimelineState::new(repository));
    app.manage(ContextBridgeState::native());
    app.manage(TriggerEngineState::new());
    app.manage(FrontendLifecycleState::default());
    app.manage(settings_state);
    app.manage(llm_state);
    app.manage(sidecar_state);
    app.manage(CompanionWindowVisibility::default());
    app.manage(OcrState::platform_default());
    app.manage(ScreenCaptureState::platform_default());
    phase.finish();
    let phase = StartupPhaseTimer::start("menu_bar_setup");
    setup_menu_bar(app)?;
    phase.finish();

    if start_sidecar {
        log_info(
            LogArea::Startup,
            "local-first sidecar warmup scheduled after startup delay",
        );
        let app_handle = app.handle().clone();
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(500));
            let handle = app_handle.clone();
            let _ = app_handle.run_on_main_thread(move || {
                let phase = StartupPhaseTimer::start("deferred_sidecar_ensure_running");
                let sidecar = handle.state::<LlamaSidecarState>();
                if let Err(error) = sidecar.ensure_running() {
                    let _ = sidecar.record_error(error);
                }
                phase.finish();
            });
        });
    }

    #[cfg(target_os = "macos")]
    {
        let phase = StartupPhaseTimer::start("macos_window_configure");
        if let Some(win) = app.get_webview_window("main") {
            configure_macos_main_window(&win);
            watch_resident_window_close(&win);
            schedule_macos_webview_layer_refresh(app.handle().clone(), "main");
        }
        if let Some(win) = app.get_webview_window("companion") {
            configure_macos_companion_window(&win);
            restore_companion_window_on_active_space(app.handle());
            watch_companion_window_layout(app.handle(), &win);
            watch_resident_window_close(&win);
            watch_macos_companion_space_changes(app.handle());
        }
        phase.finish();
    }

    #[cfg(not(target_os = "macos"))]
    {
        let phase = StartupPhaseTimer::start("window_configure");
        if let Some(win) = app.get_webview_window("main") {
            watch_resident_window_close(&win);
        }
        if let Some(win) = app.get_webview_window("companion") {
            position_companion_window(&win);
            watch_companion_window_layout(app.handle(), &win);
            watch_resident_window_close(&win);
        }
        phase.finish();
    }

    #[cfg(debug_assertions)]
    {
        let phase = StartupPhaseTimer::start("debug_dev_auth_callback_server_start");
        match start_dev_auth_callback_server(app.handle().clone()) {
            Ok(_) => log_info(LogArea::Auth, "debug dev auth callback server ready"),
            Err(error) => log_error(
                LogArea::Auth,
                format!("debug dev auth callback server start failed: {error}"),
            ),
        }
        phase.finish();
    }

    setup_timer.finish();
    Ok(())
}
