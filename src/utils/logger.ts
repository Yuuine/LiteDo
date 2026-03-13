/**
 * 统一日志工具
 * 提供操作日志和调试日志的统一入口
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

export interface OperationLog {
  timestamp: string;
  operation_type: string;
  operation_object: string;
  description: string;
  result: string;
}

export interface SystemLog {
  timestamp: string;
  action: string;
  target: string;
  details: string;
}

let currentTraceId: string | null = null;

function generateTraceId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function writeDebugLog(
  level: 'debug' | 'info' | 'warn' | 'error',
  category: string,
  message: string,
  data?: unknown,
  duration_ms?: number
): Promise<void> {
  try {
    await invoke('write_debug_log', {
      level,
      category,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : null,
      trace_id: currentTraceId,
      duration_ms,
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
    default:
      console.log(consoleMsg, data ?? '');
  }
}

async function writeOperationLog(
  operationType: string,
  operationObject: string,
  description: string,
  result: string = '成功'
): Promise<void> {
  try {
    await invoke('write_operation_log', {
      operationType,
      operationObject,
      description,
      result,
    });
  } catch (e) {
    console.error('Failed to write operation log:', e);
  }
}

async function writeSystemLog(
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

export async function debug(category: string, message: string, data?: unknown): Promise<void> {
  await writeDebugLog('debug', category, message, data);
}

export async function info(category: string, message: string, data?: unknown): Promise<void> {
  await writeDebugLog('info', category, message, data);
}

export async function warn(category: string, message: string, data?: unknown): Promise<void> {
  await writeDebugLog('warn', category, message, data);
}

export async function error(category: string, message: string, data?: unknown): Promise<void> {
  await writeDebugLog('error', category, message, data);
}

export async function operation(
  operationType: string,
  operationObject: string,
  description: string,
  result: string = '成功'
): Promise<void> {
  await writeOperationLog(operationType, operationObject, description, result);
}

export async function system(
  action: string,
  target: string,
  details: string
): Promise<void> {
  await writeSystemLog(action, target, details);
}

export async function time<T>(category: string, message: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    await writeDebugLog('info', category, message, undefined, duration);
    return result;
  } catch (e) {
    const duration = Date.now() - start;
    await writeDebugLog('error', category, `${message} (failed)`, e, duration);
    throw e;
  }
}

export function startTrace(): string {
  currentTraceId = generateTraceId();
  return currentTraceId;
}

export function endTrace(): void {
  currentTraceId = null;
}

export async function getDebugLogs(): Promise<DebugLog[]> {
  try {
    const logs = await invoke<DebugLog[]>('get_debug_logs');
    return logs;
  } catch (e) {
    console.error('Failed to get debug logs:', e);
    return [];
  }
}

export async function getOperationLogs(): Promise<OperationLog[]> {
  try {
    const logs = await invoke<OperationLog[]>('get_operation_logs');
    return logs;
  } catch (e) {
    console.error('Failed to get operation logs:', e);
    return [];
  }
}

export async function clearDebugLogs(): Promise<void> {
  try {
    await invoke('clear_debug_logs');
  } catch (e) {
    console.error('Failed to clear debug logs:', e);
  }
}

export async function clearOperationLogs(): Promise<void> {
  try {
    await invoke('clear_operation_logs');
  } catch (e) {
    console.error('Failed to clear operation logs:', e);
  }
}

export default {
  debug,
  info,
  warn,
  error,
  operation,
  system,
  time,
  startTrace,
  endTrace,
  getDebugLogs,
  getOperationLogs,
  clearDebugLogs,
  clearOperationLogs,
};
