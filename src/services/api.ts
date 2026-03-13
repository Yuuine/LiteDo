import { invoke } from '@tauri-apps/api/core';
import type { Todo, PriorityType } from '../types/todo';
import logger from '../utils/logger';

export async function getTodos(): Promise<Todo[]> {
  logger.info('API', 'Fetching todos');
  try {
    const result = await invoke<Todo[]>('get_todos');
    logger.info('API', 'Fetched todos successfully', { count: result.length });
    return result;
  } catch (e) {
    logger.error('API', 'Failed to fetch todos', e);
    throw e;
  }
}

export async function addTodoWithDate(content: string, sortOrder: number, createdAt: number, priority: PriorityType = 'medium'): Promise<Todo> {
  const params = { content, priority, sortOrder, createdAt };
  logger.info('API', 'Adding todo with date', params);
  try {
    const result = await invoke<Todo>('add_todo_with_date', params);
    logger.info('API', 'Added todo with date successfully', result);
    return result;
  } catch (e) {
    logger.error('API', 'Failed to add todo with date', { error: e, params });
    throw e;
  }
}

export async function toggleTodo(id: string, completed: boolean): Promise<void> {
  logger.info('API', 'Toggling todo', { id, completed });
  try {
    await invoke('toggle_todo', { id, completed });
    logger.info('API', 'Toggled todo successfully');
  } catch (e) {
    logger.error('API', 'Failed to toggle todo', e);
    throw e;
  }
}

export async function deleteTodo(id: string): Promise<void> {
  logger.info('API', 'Deleting todo', { id });
  try {
    await invoke('delete_todo', { id });
    logger.info('API', 'Deleted todo successfully');
  } catch (e) {
    logger.error('API', 'Failed to delete todo', e);
    throw e;
  }
}

export async function updateTodoContent(id: string, content: string): Promise<void> {
  logger.info('API', 'Updating todo content', { id, content });
  try {
    await invoke('update_todo_content', { id, content });
    logger.info('API', 'Updated todo content successfully');
  } catch (e) {
    logger.error('API', 'Failed to update todo content', e);
    throw e;
  }
}

export async function updateTodoOrder(id: string, sortOrder: number): Promise<void> {
  logger.info('API', 'Updating todo order', { id, sortOrder });
  try {
    await invoke('update_todo_order', { id, sortOrder });
    logger.info('API', 'Updated todo order successfully');
  } catch (e) {
    logger.error('API', 'Failed to update todo order', e);
    throw e;
  }
}
