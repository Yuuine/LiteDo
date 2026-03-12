/**
 * 操作日志工具
 * 记录用户在系统中的所有关键操作
 */

import { invoke } from '@tauri-apps/api/core';

export interface OperationLog {
  timestamp: string;
  operation_type: string;
  operation_object: string;
  description: string;
  result: string;
}

export type OperationType = 
  | '任务管理'
  | '系统配置'
  | '数据导出'
  | '用户操作';

export type OperationResult = 
  | '成功'
  | '失败'
  | '已完成'
  | '已取消';

/**
 * 记录操作日志
 * @param operationType - 操作类型
 * @param operationObject - 操作对象
 * @param description - 操作描述
 * @param result - 操作结果
 */
export async function logOperation(
  operationType: OperationType,
  operationObject: string,
  description: string,
  result: OperationResult = '成功'
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

/**
 * 获取操作日志列表
 */
export async function getOperationLogs(): Promise<OperationLog[]> {
  try {
    const logs = await invoke<OperationLog[]>('get_operation_logs');
    return logs;
  } catch (e) {
    console.error('Failed to get operation logs:', e);
    return [];
  }
}

/**
 * 清除操作日志
 */
export async function clearOperationLogs(): Promise<void> {
  try {
    await invoke('clear_operation_logs');
  } catch (e) {
    console.error('Failed to clear operation logs:', e);
  }
}

/**
 * 获取操作日志文件路径
 */
export async function getOperationLogPath(): Promise<string> {
  try {
    const path = await invoke<string>('get_operation_log_path_cmd');
    return path;
  } catch (e) {
    console.error('Failed to get operation log path:', e);
    return '';
  }
}

export default {
  logOperation,
  getOperationLogs,
  clearOperationLogs,
  getOperationLogPath,
};
