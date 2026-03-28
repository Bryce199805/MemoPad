#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, WindowEvent,
};

const SNAP_THRESHOLD: i32 = 15;

fn snap_to_edges(window: &tauri::WebviewWindow) {
    if let Ok(pos) = window.outer_position() {
        if let Ok(size) = window.outer_size() {
            let ww = size.width as i32;
            let wh = size.height as i32;
            let wx = pos.x;
            let wy = pos.y;
            let mut new_x = wx;
            let mut new_y = wy;

            if let Ok(monitors) = window.available_monitors() {
                for monitor in monitors {
                    let monitor_size = monitor.size();
                    let monitor_pos = monitor.position();
                    let mx = monitor_pos.x;
                    let my = monitor_pos.y;
                    let mw = monitor_size.width as i32;
                    let mh = monitor_size.height as i32;

                    // Left edge
                    if (wx - mx).abs() <= SNAP_THRESHOLD {
                        new_x = mx;
                    }
                    // Right edge
                    if (wx + ww - mx - mw).abs() <= SNAP_THRESHOLD {
                        new_x = mx + mw - ww;
                    }
                    // Top edge
                    if (wy - my).abs() <= SNAP_THRESHOLD {
                        new_y = my;
                    }
                    // Bottom edge
                    if (wy + wh - my - mh).abs() <= SNAP_THRESHOLD {
                        new_y = my + mh - wh;
                    }
                }
            }

            if new_x != wx || new_y != wy {
                let _ = window.set_position(tauri::Position::Physical(
                    tauri::PhysicalPosition::new(new_x, new_y),
                ));
            }
        }
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            window.set_shadow(true).unwrap();
            window.set_ignore_cursor_events(false).unwrap();

            let window_emit = window.clone();
            let window_snap = window.clone();
            window.on_window_event(move |event| {
                if let WindowEvent::Moved(position) = event {
                    let _ = window_emit.emit("window-moved", position);
                    let snap_window = window_snap.clone();
                    std::thread::spawn(move || {
                        snap_to_edges(&snap_window);
                    });
                }
            });

            let show_item = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let hide_item = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

            let menu = Menu::with_items(app, &[&show_item, &hide_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            window.show().unwrap();
                            window.set_focus().unwrap();
                        }
                    }
                    "hide" => {
                        if let Some(window) = app.get_webview_window("main") {
                            window.hide().unwrap();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            window.show().unwrap();
                            window.set_focus().unwrap();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
