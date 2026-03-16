mod commands;
mod debug_log;
mod operation_log;
mod system_log;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_todos,
            commands::add_todo,
            commands::add_todo_with_date,
            commands::toggle_todo,
            commands::delete_todo,
            commands::update_todo_content,
            commands::update_todo_order,
            commands::get_logs,
            commands::open_log_file,
            commands::save_debug_log,
            commands::get_app_data_dir,
            commands::open_file_location,
            commands::open_log_file_location,
            debug_log::write_debug_log,
            debug_log::get_debug_logs,
            debug_log::clear_debug_logs,
            debug_log::get_debug_log_path_cmd,
            operation_log::write_operation_log,
            operation_log::get_operation_logs,
            operation_log::clear_operation_logs,
            operation_log::get_operation_log_path_cmd,
            system_log::write_system_log,
            system_log::get_system_logs,
            system_log::clear_system_logs,
            system_log::get_system_log_path_cmd
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
