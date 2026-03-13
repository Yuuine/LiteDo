use serde::{Deserialize, Serialize};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemLog {
    pub timestamp: String,
    pub action: String,
    pub target: String,
    pub details: String,
}

fn get_system_log_path(app_handle: &tauri::AppHandle) -> PathBuf {
    let app_dir = app_handle.path().app_data_dir().expect("Failed to get app data dir");
    fs::create_dir_all(&app_dir).ok();
    app_dir.join("system.log")
}

fn format_system_log(log: &SystemLog) -> String {
    format!(
        "[{}] {} - {} | {}\n",
        log.timestamp, log.action, log.target, log.details
    )
}

#[tauri::command]
pub async fn write_system_log(
    app: tauri::AppHandle,
    action: String,
    target: String,
    details: String,
) -> Result<(), String> {
    let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    
    let log = SystemLog {
        timestamp,
        action,
        target,
        details,
    };
    
    let log_path = get_system_log_path(&app);
    let log_entry = format_system_log(&log);
    
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .map_err(|e| format!("Failed to open system log file: {}", e))?;
    
    file.write_all(log_entry.as_bytes())
        .map_err(|e| format!("Failed to write system log: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub async fn get_system_logs(app: tauri::AppHandle) -> Result<Vec<SystemLog>, String> {
    let log_path = get_system_log_path(&app);
    
    if !log_path.exists() {
        return Ok(Vec::new());
    }
    
    let content = fs::read_to_string(&log_path)
        .map_err(|e| format!("Failed to read system log file: {}", e))?;
    
    let logs: Vec<SystemLog> = content
        .lines()
        .filter_map(|line| {
            let parts: Vec<&str> = line.splitn(4, ' ').collect();
            if parts.len() >= 4 {
                let timestamp_with_bracket = format!("[{}]", parts[0]);
                let timestamp = timestamp_with_bracket[1..timestamp_with_bracket.len()-1].to_string();
                
                let rest = parts[3];
                let rest_parts: Vec<&str> = rest.splitn(3, ' ').collect();
                if rest_parts.len() >= 3 {
                    let action = rest_parts[0].trim_end_matches(" -").to_string();
                    let target = rest_parts[1].trim_end_matches(" |").to_string();
                    let details = rest_parts[2].to_string();
                    
                    Some(SystemLog {
                        timestamp,
                        action,
                        target,
                        details,
                    })
                } else {
                    None
                }
            } else {
                None
            }
        })
        .collect();
    
    Ok(logs)
}

#[tauri::command]
pub async fn clear_system_logs(app: tauri::AppHandle) -> Result<(), String> {
    let log_path = get_system_log_path(&app);
    
    if log_path.exists() {
        fs::remove_file(&log_path)
            .map_err(|e| format!("Failed to clear system log file: {}", e))?;
    }
    
    Ok(())
}

#[tauri::command]
pub async fn get_system_log_path_cmd(app: tauri::AppHandle) -> Result<String, String> {
    let log_path = get_system_log_path(&app);
    Ok(log_path.to_string_lossy().to_string())
}
