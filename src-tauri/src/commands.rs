use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Todo {
    pub id: String,
    pub content: String,
    pub completed: bool,
    pub priority: String,
    pub created_at: i64,
    pub completed_at: Option<i64>,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct LogEntry {
    pub id: String,
    pub action: String,
    pub todo_content: Option<String>,
    pub created_at: i64,
}

fn current_timestamp() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
}

async fn get_db(app: &tauri::AppHandle) -> Result<sqlx::sqlite::SqlitePool, String> {
    use once_cell::sync::OnceCell;
    use sqlx::sqlite::{SqlitePool, SqlitePoolOptions};

    static DB_POOL: OnceCell<SqlitePool> = OnceCell::new();

    if let Some(pool) = DB_POOL.get() {
        return Ok(pool.clone());
    }

    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    std::fs::create_dir_all(&app_dir)
        .map_err(|e| format!("Failed to create app data dir: {}", e))?;

    let db_path = app_dir.join("litedo.db");
    let db_url = format!("sqlite:{}?mode=rwc", db_path.display());

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS todos (
            id TEXT PRIMARY KEY,
            content TEXT NOT NULL,
            completed INTEGER DEFAULT 0,
            priority TEXT DEFAULT 'medium',
            created_at INTEGER NOT NULL,
            completed_at INTEGER,
            sort_order INTEGER DEFAULT 0
        )",
    )
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to create table: {}", e))?;

    let add_sort_order_result = sqlx::query(
        "ALTER TABLE todos ADD COLUMN sort_order INTEGER DEFAULT 0"
    )
    .execute(&pool)
    .await;
    
    if let Err(e) = add_sort_order_result {
        let err_msg = e.to_string();
        if !err_msg.contains("duplicate column name") {
            eprintln!("Warning: Could not add sort_order column: {}", err_msg);
        }
    }

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS logs (
            id TEXT PRIMARY KEY,
            action TEXT NOT NULL,
            todo_content TEXT,
            created_at INTEGER NOT NULL
        )",
    )
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to create logs table: {}", e))?;

    let _ = DB_POOL.set(pool.clone());

    Ok(pool)
}

async fn add_log(
    db: &sqlx::sqlite::SqlitePool,
    action: &str,
    todo_content: Option<&str>,
) -> Result<(), String> {
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = current_timestamp();

    sqlx::query("INSERT INTO logs (id, action, todo_content, created_at) VALUES (?, ?, ?, ?)")
        .bind(&id)
        .bind(action)
        .bind(todo_content)
        .bind(created_at)
        .execute(db)
        .await
        .map_err(|e| format!("Failed to insert log: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn get_todos(app: tauri::AppHandle) -> Result<Vec<Todo>, String> {
    let db = get_db(&app).await?;

    let rows = sqlx::query_as::<_, Todo>(
        "SELECT id, content, completed, priority, created_at, completed_at, COALESCE(sort_order, 0) as sort_order FROM todos ORDER BY sort_order ASC"
    )
    .fetch_all(&db)
    .await
    .map_err(|e| format!("Failed to fetch todos: {}", e))?;

    Ok(rows)
}

#[tauri::command]
pub async fn add_todo(
    app: tauri::AppHandle,
    content: String,
    priority: String,
    sort_order: i32,
) -> Result<Todo, String> {
    let created_at = current_timestamp();
    add_todo_with_date(app, content, priority, sort_order, created_at).await
}

#[tauri::command]
pub async fn add_todo_with_date(
    app: tauri::AppHandle,
    content: String,
    priority: String,
    sort_order: i32,
    created_at: i64,
) -> Result<Todo, String> {
    let db = get_db(&app).await?;
    let id = uuid::Uuid::new_v4().to_string();

    sqlx::query(
        "INSERT INTO todos (id, content, completed, priority, created_at, sort_order) VALUES (?, ?, 0, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&content)
    .bind(&priority)
    .bind(created_at)
    .bind(sort_order)
    .execute(&db)
    .await
    .map_err(|e| format!("Failed to insert todo: {}", e))?;

    add_log(&db, "create", Some(&content)).await?;

    Ok(Todo {
        id,
        content,
        completed: false,
        priority,
        created_at,
        completed_at: None,
        sort_order,
    })
}

#[tauri::command]
pub async fn toggle_todo(
    app: tauri::AppHandle,
    id: String,
    completed: bool,
) -> Result<(), String> {
    let db = get_db(&app).await?;
    
    let todo: Option<Todo> = sqlx::query_as::<_, Todo>(
        "SELECT id, content, completed, priority, created_at, completed_at, COALESCE(sort_order, 0) as sort_order FROM todos WHERE id = ?"
    )
    .bind(&id)
    .fetch_optional(&db)
    .await
    .map_err(|e| format!("Failed to fetch todo: {}", e))?;

    let todo_content = todo.as_ref().map(|t| t.content.as_str());

    let completed_at = if completed {
        Some(current_timestamp())
    } else {
        None
    };

    sqlx::query("UPDATE todos SET completed = ?, completed_at = ? WHERE id = ?")
        .bind(completed)
        .bind(completed_at)
        .bind(&id)
        .execute(&db)
        .await
        .map_err(|e| format!("Failed to toggle todo: {}", e))?;

    let action = if completed { "complete" } else { "uncomplete" };
    add_log(&db, action, todo_content).await?;

    Ok(())
}

#[tauri::command]
pub async fn delete_todo(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let db = get_db(&app).await?;

    let todo: Option<Todo> = sqlx::query_as::<_, Todo>(
        "SELECT id, content, completed, priority, created_at, completed_at, COALESCE(sort_order, 0) as sort_order FROM todos WHERE id = ?"
    )
    .bind(&id)
    .fetch_optional(&db)
    .await
    .map_err(|e| format!("Failed to fetch todo: {}", e))?;

    let todo_content = todo.as_ref().map(|t| t.content.as_str());

    sqlx::query("DELETE FROM todos WHERE id = ?")
        .bind(&id)
        .execute(&db)
        .await
        .map_err(|e| format!("Failed to delete todo: {}", e))?;

    add_log(&db, "delete", todo_content).await?;

    Ok(())
}

#[tauri::command]
pub async fn update_todo_content(
    app: tauri::AppHandle,
    id: String,
    content: String,
) -> Result<(), String> {
    let db = get_db(&app).await?;

    sqlx::query("UPDATE todos SET content = ? WHERE id = ?")
        .bind(&content)
        .bind(&id)
        .execute(&db)
        .await
        .map_err(|e| format!("Failed to update todo content: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn update_todo_order(
    app: tauri::AppHandle,
    id: String,
    sort_order: i32,
) -> Result<(), String> {
    let db = get_db(&app).await?;

    sqlx::query("UPDATE todos SET sort_order = ? WHERE id = ?")
        .bind(sort_order)
        .bind(&id)
        .execute(&db)
        .await
        .map_err(|e| format!("Failed to update todo order: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn get_logs(app: tauri::AppHandle) -> Result<Vec<LogEntry>, String> {
    let db = get_db(&app).await?;

    let rows = sqlx::query_as::<_, LogEntry>(
        "SELECT id, action, todo_content, created_at FROM logs ORDER BY created_at DESC LIMIT 100"
    )
    .fetch_all(&db)
    .await
    .map_err(|e| format!("Failed to fetch logs: {}", e))?;

    Ok(rows)
}

#[tauri::command]
pub async fn open_log_file(app: tauri::AppHandle) -> Result<String, String> {
    use std::process::Command;
    
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    
    let log_path = app_dir.join("litedo.db");
    
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(&log_path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&log_path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&log_path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }
    
    Ok(log_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn save_debug_log(app: tauri::AppHandle, content: String) -> Result<String, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    
    let log_path = app_dir.join("debug.log");
    
    std::fs::write(&log_path, content)
        .map_err(|e| format!("Failed to write log file: {}", e))?;
    
    Ok(log_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn get_app_data_dir(app: tauri::AppHandle) -> Result<String, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    
    Ok(app_dir.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn open_file_location(app: tauri::AppHandle, path: String) -> Result<String, String> {
    use std::process::Command;
    
    let log_path = std::path::PathBuf::from(&path);
    
    if !log_path.exists() {
        std::fs::write(&log_path, "")
            .map_err(|e| format!("Failed to create log file: {}", e))?;
    }
    
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .args(["/select,", &log_path.to_string_lossy()])
            .spawn()
            .map_err(|e| format!("Failed to open file location: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .args(["-R", &log_path.to_string_lossy()])
            .spawn()
            .map_err(|e| format!("Failed to open file location: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        let parent = log_path.parent().unwrap_or(std::path::Path::new("."));
        Command::new("xdg-open")
            .arg(parent)
            .spawn()
            .map_err(|e| format!("Failed to open file location: {}", e))?;
    }
    
    Ok(log_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn open_log_file_location(app: tauri::AppHandle) -> Result<String, String> {
    use std::process::Command;
    
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    
    let log_path = app_dir.join("debug.log");
    
    if !log_path.exists() {
        std::fs::write(&log_path, "")
            .map_err(|e| format!("Failed to create log file: {}", e))?;
    }
    
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .args(["/select,", &log_path.to_string_lossy()])
            .spawn()
            .map_err(|e| format!("Failed to open file location: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .args(["-R", &log_path.to_string_lossy()])
            .spawn()
            .map_err(|e| format!("Failed to open file location: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&app_dir)
            .spawn()
            .map_err(|e| format!("Failed to open file location: {}", e))?;
    }
    
    Ok(log_path.to_string_lossy().to_string())
}
