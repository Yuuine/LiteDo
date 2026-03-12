use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DebugLog {
    pub timestamp: String,
    pub level: String,
    pub category: String,
    pub message: String,
    pub data: Option<serde_json::Value>,
    pub trace_id: Option<String>,
    pub duration_ms: Option<u64>,
}

static DEBUG_LOGS: Mutex<Vec<DebugLog>> = Mutex::new(Vec::new());

fn get_debug_log_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    
    fs::create_dir_all(&app_dir)
        .map_err(|e| format!("Failed to create app data dir: {}", e))?;
    
    Ok(app_dir.join("debug.log"))
}

fn format_debug_log(log: &DebugLog) -> String {
    let mut entry = serde_json::to_value(log).unwrap_or_default();
    if let Some(obj) = entry.as_object_mut() {
        obj.retain(|_, v| !v.is_null());
    }
    serde_json::to_string(&entry).unwrap_or_else(|_| "{}".to_string())
}

#[tauri::command]
pub async fn write_debug_log(
    app: tauri::AppHandle,
    level: String,
    category: String,
    message: String,
    data: Option<serde_json::Value>,
    trace_id: Option<String>,
    duration_ms: Option<u64>,
) -> Result<(), String> {
    let log = DebugLog {
        timestamp: chrono::Utc::now().to_rfc3339(),
        level,
        category,
        message,
        data,
        trace_id,
        duration_ms,
    };
    
    let mut logs = DEBUG_LOGS.lock().map_err(|e| format!("Failed to lock logs: {}", e))?;
    logs.push(log.clone());
    
    if logs.len() > 500 {
        let drain_count = logs.len() - 500;
        logs.drain(0..drain_count);
    }
    
    let log_path = get_debug_log_path(&app)?;
    let log_line = format_debug_log(&log);
    
    fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .and_then(|mut file| {
            use std::io::Write;
            writeln!(file, "{}", log_line)
        })
        .map_err(|e| format!("Failed to write debug log: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub async fn get_debug_logs(app: tauri::AppHandle) -> Result<Vec<DebugLog>, String> {
    let log_path = get_debug_log_path(&app)?;
    
    if !log_path.exists() {
        return Ok(Vec::new());
    }
    
    let content = fs::read_to_string(&log_path)
        .map_err(|e| format!("Failed to read debug log: {}", e))?;
    
    let mut logs = Vec::new();
    for line in content.lines() {
        if line.is_empty() {
            continue;
        }
        
        if let Ok(log) = serde_json::from_str::<DebugLog>(line) {
            logs.push(log);
        }
    }
    
    let mut cached_logs = DEBUG_LOGS.lock().map_err(|e| format!("Failed to lock logs: {}", e))?;
    *cached_logs = logs.clone();
    
    Ok(logs)
}

#[tauri::command]
pub async fn clear_debug_logs(app: tauri::AppHandle) -> Result<(), String> {
    let mut logs = DEBUG_LOGS.lock().map_err(|e| format!("Failed to lock logs: {}", e))?;
    logs.clear();
    
    let log_path = get_debug_log_path(&app)?;
    
    if log_path.exists() {
        fs::remove_file(&log_path)
            .map_err(|e| format!("Failed to remove debug log: {}", e))?;
    }
    
    Ok(())
}

#[tauri::command]
pub async fn get_debug_log_path_cmd(app: tauri::AppHandle) -> Result<String, String> {
    let log_path = get_debug_log_path(&app)?;
    Ok(log_path.to_string_lossy().to_string())
}
