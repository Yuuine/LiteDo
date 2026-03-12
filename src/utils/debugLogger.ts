/**
 * 调试日志工具
 * 记录系统运行时的详细信息，遵循大型互联网企业日志规范
 */

import { invoke } from '@tauri-apps/api/core';

export interface DebugLog {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  category: string;
  message: string;
  data?: unknown;
  trace_id?: string;
  duration_ms?: number;
}

let currentTraceId: string | null = null;

/**
 * 生成追踪ID
 */
function generateTraceId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 开始一个新的追踪链路
 */
export function startTrace(): string {
  currentTraceId = generateTraceId();
  return currentTraceId;
}

/**
 * 结束当前追踪链路
 */
export function endTrace(): void {
  currentTraceId = null;
}

/**
 * 记录调试日志
 * @param level - 日志级别
 * @param category - 日志分类
 * @param message - 日志消息
 * @param data - 附加数据
 * @param durationMs - 操作耗时（毫秒）
 */
export async function debugLog(
  level: 'debug' | 'info' | 'warn' | 'error',
  category: string,
  message: string,
  data?: unknown,
  durationMs?: number
): Promise<void> {
  try {
    await invoke('write_debug_log', {
      level,
      category,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : null,
      traceId: currentTraceId,
      durationMs: durationMs ?? null,
    });
  } catch (e) {
    console.error('Failed to write debug log:', e);
  }
  
  const consoleMsg = `[${new Date().toISOString()}] [${level.toUpperCase()}] [${category}] ${message}`;
  switch (level) {
    case 'error':
      console.error(consoleMsg, data ?? '');
      break;
    case 'warn':
      console.warn(consoleMsg, data ?? '');
      break;
    case 'debug':
      console.debug(consoleMsg, data ?? '');
      break;
    default:
      console.log(consoleMsg, data ?? '');
  }
}

/**
 * 记录 DEBUG 级别日志
 */
export async function debug(category: string, message: string, data?: unknown): Promise<void> {
  await debugLog('debug', category, message, data);
}

/**
 * 记录 INFO 级别日志
 */
export async function info(category: string, message: string, data?: unknown): Promise<void> {
  await debugLog('info', category, message, data);
}

/**
 * 记录 WARN 级别日志
 */
export async function warn(category: string, message: string, data?: unknown): Promise<void> {
  await debugLog('warn', category, message, data);
}

/**
 * 记录 ERROR 级别日志
 */
export async function error(category: string, message: string, data?: unknown): Promise<void> {
  await debugLog('error', category, message, data);
}

/**
 * 记录性能日志
 */
export async function perf(category: string, message: string, durationMs: number, data?: unknown): Promise<void> {
  await debugLog('info', category, message, data, durationMs);
}

/**
 * 获取调试日志列表
 */
export async function getDebugLogs(): Promise<DebugLog[]> {
  try {
    const logs = await invoke<DebugLog[]>('get_debug_logs');
    return logs;
  } catch (e) {
    console.error('Failed to get debug logs:', e);
    return [];
  }
}

/**
 * 清除调试日志
 */
export async function clearDebugLogs(): Promise<void> {
  try {
    await invoke('clear_debug_logs');
  } catch (e) {
    console.error('Failed to clear debug logs:', e);
  }
}

/**
 * 获取调试日志文件路径
 */
export async function getDebugLogPath(): Promise<string> {
  try {
    const path = await invoke<string>('get_debug_log_path_cmd');
    return path;
  } catch (e) {
    console.error('Failed to get debug log path:', e);
    return '';
  }
}

export default {
  debug,
  info,
  warn,
  error,
  perf,
  startTrace,
  endTrace,
  getDebugLogs,
  clearDebugLogs,
  getDebugLogPath,
};
