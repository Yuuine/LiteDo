use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OperationLog {
    pub timestamp: String,
    pub operation_type: String,
    pub operation_object: String,
    pub description: String,
    pub result: String,
}

static OPERATION_LOGS: Mutex<Vec<OperationLog>> = Mutex::new(Vec::new());

fn get_operation_log_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    
    fs::create_dir_all(&app_dir)
        .map_err(|e| format!("Failed to create app data dir: {}", e))?;
    
    Ok(app_dir.join("operation.log"))
}

fn format_operation_log(log: &OperationLog) -> String {
    format!(
        "[{}] {} - {} | {} | {}\n",
        log.timestamp,
        log.operation_type,
        log.operation_object,
        log.description,
        log.result
    )
}

#[tauri::command]
pub async fn write_operation_log(
    app: tauri::AppHandle,
    operation_type: String,
    operation_object: String,
    description: String,
    result: String,
) -> Result<(), String> {
    let log = OperationLog {
        timestamp: chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        operation_type,
        operation_object,
        description,
        result,
    };
    
    let mut logs = OPERATION_LOGS.lock().map_err(|e| format!("Failed to lock logs: {}", e))?;
    logs.push(log.clone());
    
    if logs.len() > 1000 {
        let drain_count = logs.len() - 1000;
        logs.drain(0..drain_count);
    }
    
    let log_path = get_operation_log_path(&app)?;
    let log_line = format_operation_log(&log);
    
    fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .and_then(|mut file| {
            use std::io::Write;
            write!(file, "{}", log_line)
        })
        .map_err(|e| format!("Failed to write operation log: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub async fn get_operation_logs(app: tauri::AppHandle) -> Result<Vec<OperationLog>, String> {
    let log_path = get_operation_log_path(&app)?;
    
    if !log_path.exists() {
        return Ok(Vec::new());
    }
    
    let content = fs::read_to_string(&log_path)
        .map_err(|e| format!("Failed to read operation log: {}", e))?;
    
    let mut logs = Vec::new();
    for line in content.lines() {
        if line.is_empty() {
            continue;
        }
        
        if let Some(parsed) = parse_operation_log_line(line) {
            logs.push(parsed);
        }
    }
    
    let mut cached_logs = OPERATION_LOGS.lock().map_err(|e| format!("Failed to lock logs: {}", e))?;
    *cached_logs = logs.clone();
    
    Ok(logs)
}

fn parse_operation_log_line(line: &str) -> Option<OperationLog> {
    let line = line.trim_start_matches('[');
    let parts: Vec<&str> = line.splitn(2, ']').collect();
    if parts.len() != 2 {
        return None;
    }
    
    let timestamp = parts[0].to_string();
    let rest = parts[1].trim();
    
    let parts: Vec<&str> = rest.splitn(2, " - ").collect();
    if parts.len() != 2 {
        return None;
    }
    
    let operation_type = parts[0].to_string();
    let rest = parts[1];
    
    let parts: Vec<&str> = rest.splitn(3, " | ").collect();
    if parts.len() != 3 {
        return None;
    }
    
    Some(OperationLog {
        timestamp,
        operation_type,
        operation_object: parts[0].to_string(),
        description: parts[1].to_string(),
        result: parts[2].to_string(),
    })
}

#[tauri::command]
pub async fn clear_operation_logs(app: tauri::AppHandle) -> Result<(), String> {
    let mut logs = OPERATION_LOGS.lock().map_err(|e| format!("Failed to lock logs: {}", e))?;
    logs.clear();
    
    let log_path = get_operation_log_path(&app)?;
    
    if log_path.exists() {
        fs::remove_file(&log_path)
            .map_err(|e| format!("Failed to remove operation log: {}", e))?;
    }
    
    Ok(())
}

#[tauri::command]
pub async fn get_operation_log_path_cmd(app: tauri::AppHandle) -> Result<String, String> {
    let log_path = get_operation_log_path(&app)?;
    Ok(log_path.to_string_lossy().to_string())
}
