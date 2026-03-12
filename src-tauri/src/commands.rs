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
            completed_at INTEGER
        )",
    )
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to create table: {}", e))?;

    let _ = DB_POOL.set(pool.clone());

    Ok(pool)
}

#[tauri::command]
pub async fn get_todos(app: tauri::AppHandle) -> Result<Vec<Todo>, String> {
    let db = get_db(&app).await?;

    let rows = sqlx::query_as::<_, Todo>(
        "SELECT id, content, completed, priority, created_at, completed_at FROM todos ORDER BY created_at DESC"
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
) -> Result<Todo, String> {
    let db = get_db(&app).await?;
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = current_timestamp();

    sqlx::query(
        "INSERT INTO todos (id, content, completed, priority, created_at) VALUES (?, ?, 0, ?, ?)",
    )
    .bind(&id)
    .bind(&content)
    .bind(&priority)
    .bind(created_at)
    .execute(&db)
    .await
    .map_err(|e| format!("Failed to insert todo: {}", e))?;

    Ok(Todo {
        id,
        content,
        completed: false,
        priority,
        created_at,
        completed_at: None,
    })
}

#[tauri::command]
pub async fn toggle_todo(
    app: tauri::AppHandle,
    id: String,
    completed: bool,
) -> Result<(), String> {
    let db = get_db(&app).await?;
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

    Ok(())
}

#[tauri::command]
pub async fn delete_todo(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let db = get_db(&app).await?;

    sqlx::query("DELETE FROM todos WHERE id = ?")
        .bind(&id)
        .execute(&db)
        .await
        .map_err(|e| format!("Failed to delete todo: {}", e))?;

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
