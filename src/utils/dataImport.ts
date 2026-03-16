import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import type { Todo, PriorityType } from '../types/todo';
import type { ExportData, ImportResult, ImportStrategy } from '../types/export';
import { operation } from './logger';
import * as api from '../services/api';

const CURRENT_EXPORT_VERSION = '1.0';

export async function importTodos(
  strategy: ImportStrategy,
  existingTodos: Todo[]
): Promise<ImportResult | null> {
  try {
    const filePath = await open({
      multiple: false,
      filters: [
        { name: 'JSON', extensions: ['json'] },
        { name: '所有文件', extensions: ['*'] },
      ],
    });

    if (!filePath) {
      return null;
    }

    const fileData = await readFile(filePath as string);
    const content = new TextDecoder().decode(fileData);
    const parsed = JSON.parse(content);

    if (!validateExportFormat(parsed)) {
      throw new Error('无效的导出文件格式');
    }

    const data = migrateExportData(parsed);
    const result = await processImport(data, strategy, existingTodos);

    const statusText = result.success 
      ? `成功 ${result.imported} 条, 跳过 ${result.skipped} 条`
      : `部分失败: 成功 ${result.imported} 条, 跳过 ${result.skipped} 条, 错误 ${result.errors.length} 条`;
    
    await operation(
      '数据管理',
      '导入',
      statusText,
      result.success ? '成功' : '部分失败'
    );

    return result;
  } catch (error) {
    await operation('数据管理', '导入', `导入失败: ${error}`, '失败');
    throw error;
  }
}

function validateExportFormat(data: unknown): data is ExportData {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  
  if (obj.app !== 'LiteDo') return false;
  if (typeof obj.version !== 'string') return false;
  if (!Array.isArray(obj.todos)) return false;
  
  return true;
}

function migrateExportData(data: ExportData): ExportData {
  const [major] = data.version.split('.');
  const [currentMajor] = CURRENT_EXPORT_VERSION.split('.');
  
  if (major !== currentMajor) {
    throw new Error(`不支持的导出版本: ${data.version}`);
  }
  
  return data;
}

async function processImport(
  data: ExportData,
  strategy: ImportStrategy,
  existingTodos: Todo[]
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    total: data.todos.length,
    imported: 0,
    skipped: 0,
    errors: [],
  };

  const existingIds = new Set(existingTodos.map(t => t.id));

  if (strategy === 'replace') {
    for (const todo of existingTodos) {
      try {
        await api.deleteTodo(todo.id);
      } catch (e) {
        result.errors.push(`删除失败 [${todo.id}]: ${e}`);
      }
    }
  }

  for (const exportedTodo of data.todos) {
    try {
      if (strategy === 'skip_duplicates' && existingIds.has(exportedTodo.id)) {
        result.skipped++;
        continue;
      }

      const validatedTodo = validateTodo(exportedTodo);
      
      await api.addTodoWithDate(
        validatedTodo.content,
        validatedTodo.sort_order,
        validatedTodo.created_at,
        validatedTodo.priority
      );

      result.imported++;
    } catch (e) {
      result.success = false;
      const errorMsg = e instanceof Error ? e.message : String(e);
      result.errors.push(`导入失败 [${exportedTodo.content?.substring(0, 20) || '未知'}]: ${errorMsg}`);
    }
  }

  return result;
}

function validateTodo(todo: unknown): Todo {
  const t = todo as Record<string, unknown>;
  
  const validPriorities: PriorityType[] = ['low', 'medium', 'high'];
  const priority = validPriorities.includes(t.priority as PriorityType)
    ? (t.priority as PriorityType)
    : 'medium';

  return {
    id: String(t.id || ''),
    content: String(t.content || ''),
    completed: Boolean(t.completed),
    priority,
    created_at: Number(t.created_at) || Math.floor(Date.now() / 1000),
    completed_at: t.completed_at ? Number(t.completed_at) : null,
    sort_order: Number(t.sort_order) || 0,
  };
}
