use crate::{
    macos_window::{restore_companion_window_on_active_space, CompanionWindowVisibility},
    observability::{error as log_error, LogArea},
    shared::constants::APP_NAME,
};
use tauri::{
    image::Image,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

const TRAY_ID: &str = "amadeus_menu_bar";
const TRAY_OPEN_AMADEUS_ID: &str = "open_amadeus";
const TRAY_TOGGLE_COMPANION_ID: &str = "toggle_companion";
const TRAY_QUIT_AMADEUS_ID: &str = "quit_amadeus";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum TrayMenuAction {
    OpenAmadeus,
    ToggleCompanion,
    QuitAmadeus,
    Ignore,
}

fn tray_menu_action(menu_id: &str) -> TrayMenuAction {
    match menu_id {
        TRAY_OPEN_AMADEUS_ID => TrayMenuAction::OpenAmadeus,
        TRAY_TOGGLE_COMPANION_ID => TrayMenuAction::ToggleCompanion,
        TRAY_QUIT_AMADEUS_ID => TrayMenuAction::QuitAmadeus,
        _ => TrayMenuAction::Ignore,
    }
}

pub fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if let Err(error) = window.show() {
            log_error(
                LogArea::Window,
                format!("show_main_window: show failed: {error}"),
            );
        }
        if let Err(error) = window.set_focus() {
            log_error(
                LogArea::Window,
                format!("show_main_window: set_focus failed: {error}"),
            );
        }
    }
}

fn toggle_companion_window(app: &tauri::AppHandle) {
    let visibility = app.state::<CompanionWindowVisibility>();
    if let Some(window) = app.get_webview_window("companion") {
        match window.is_visible() {
            Ok(true) => {
                visibility.set_user_hidden(true);
                if let Err(error) = window.hide() {
                    log_error(
                        LogArea::Window,
                        format!("toggle_companion_window: hide failed: {error}"),
                    );
                }
            }
            Ok(false) => {
                visibility.set_user_hidden(false);
                restore_companion_window_on_active_space(app);
            }
            Err(error) => log_error(
                LogArea::Window,
                format!("toggle_companion_window: is_visible failed: {error}"),
            ),
        }
    }
}

fn handle_tray_menu_action(app: &tauri::AppHandle, action: TrayMenuAction) {
    match action {
        TrayMenuAction::OpenAmadeus => show_main_window(app),
        TrayMenuAction::ToggleCompanion => toggle_companion_window(app),
        TrayMenuAction::QuitAmadeus => app.exit(0),
        TrayMenuAction::Ignore => {}
    }
}

fn menu_bar_template_icon() -> Image<'static> {
    const SIZE: u32 = 18;
    const MASK: [&str; SIZE as usize] = [
        "000000000000000000",
        "000000011000000000",
        "000000111100000000",
        "000001111110000000",
        "000011111111000000",
        "000111100111100000",
        "001111000011110000",
        "001110000001110000",
        "001100111100110000",
        "001101111110110000",
        "001101100110110000",
        "001100000000110000",
        "000110011001100000",
        "000011111111000000",
        "000001111110000000",
        "000000111100000000",
        "000000011000000000",
        "000000000000000000",
    ];
    let mut rgba = Vec::with_capacity((SIZE * SIZE * 4) as usize);
    for row in MASK {
        for pixel in row.as_bytes() {
            if *pixel == b'1' {
                rgba.extend_from_slice(&[255, 255, 255, 255]);
            } else {
                rgba.extend_from_slice(&[255, 255, 255, 0]);
            }
        }
    }
    Image::new_owned(rgba, SIZE, SIZE)
}

pub fn setup_menu_bar(app: &tauri::App) -> tauri::Result<()> {
    let open = MenuItem::with_id(
        app,
        TRAY_OPEN_AMADEUS_ID,
        "Open Amadeus",
        true,
        None::<&str>,
    )?;
    let toggle = MenuItem::with_id(
        app,
        TRAY_TOGGLE_COMPANION_ID,
        "Show/Hide Companion",
        true,
        None::<&str>,
    )?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(
        app,
        TRAY_QUIT_AMADEUS_ID,
        "Quit Amadeus",
        true,
        None::<&str>,
    )?;
    let menu = Menu::with_items(app, &[&open, &toggle, &separator, &quit])?;
    let tray = TrayIconBuilder::with_id(TRAY_ID)
        .tooltip(APP_NAME)
        .icon(menu_bar_template_icon())
        .icon_as_template(true)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| {
            handle_tray_menu_action(app, tray_menu_action(event.id().as_ref()));
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        });

    let tray = tray.build(app)?;
    app.manage(tray);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tray_menu_ids_map_to_resident_app_actions() {
        assert_eq!(
            tray_menu_action("open_amadeus"),
            TrayMenuAction::OpenAmadeus
        );
        assert_eq!(
            tray_menu_action("toggle_companion"),
            TrayMenuAction::ToggleCompanion
        );
        assert_eq!(
            tray_menu_action("quit_amadeus"),
            TrayMenuAction::QuitAmadeus
        );
        assert_eq!(tray_menu_action("unknown"), TrayMenuAction::Ignore);
    }
}
