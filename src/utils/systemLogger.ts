const { invoke } = await import('@tauri-apps/api/core');

export interface SystemLog {
  timestamp: string;
  action: string;
  target: string;
  details: string;
}

export async function writeSystemLog(
  action: string,
  target: string,
  details: string
): Promise<void> {
  try {
    await invoke('write_system_log', { action, target, details });
  } catch (e) {
    console.error('Failed to write system log:', e);
  }
}

export async function getSystemLogs(): Promise<SystemLog[]> {
  try {
    return await invoke<SystemLog[]>('get_system_logs');
  } catch (e) {
    console.error('Failed to get system logs:', e);
    return [];
  }
}

export async function clearSystemLogs(): Promise<void> {
  try {
    await invoke('clear_system_logs');
  } catch (e) {
    console.error('Failed to clear system logs:', e);
  }
}

export async function getSystemLogPath(): Promise<string> {
  try {
    return await invoke<string>('get_system_log_path_cmd');
  } catch (e) {
    console.error('Failed to get system log path:', e);
    return '';
  }
}
