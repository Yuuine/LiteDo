import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import type { Todo } from '../types/todo';
import type { ExportData, ExportedTodo } from '../types/export';
import { operation } from './logger';

const CURRENT_EXPORT_VERSION = '1.0';
const APP_VERSION = '1.1.2';

export async function exportTodos(todos: Todo[]): Promise<boolean> {
  try {
    const defaultFileName = `litedo-export-${formatDate(new Date())}.json`;
    
    const filePath = await save({
      defaultPath: defaultFileName,
      filters: [
        { name: 'JSON', extensions: ['json'] },
        { name: '所有文件', extensions: ['*'] },
      ],
    });

    if (!filePath) {
      return false;
    }

    const exportData: ExportData = {
      version: CURRENT_EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      app: 'LiteDo',
      appVersion: APP_VERSION,
      todos: todos.map(convertToExportedTodo),
      metadata: {
        totalCount: todos.length,
        completedCount: todos.filter(t => t.completed).length,
        activeCount: todos.filter(t => !t.completed).length,
      },
    };

    await writeTextFile(filePath, JSON.stringify(exportData, null, 2));

    await operation('数据管理', '导出', `导出 ${todos.length} 条待办事项`, '成功');

    return true;
  } catch (error) {
    await operation('数据管理', '导出', `导出失败: ${error}`, '失败');
    throw error;
  }
}

function convertToExportedTodo(todo: Todo): ExportedTodo {
  return {
    id: todo.id,
    content: todo.content,
    completed: todo.completed,
    priority: todo.priority,
    created_at: todo.created_at,
    completed_at: todo.completed_at,
    sort_order: todo.sort_order,
  };
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
