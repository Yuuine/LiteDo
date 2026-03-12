import { invoke } from '@tauri-apps/api/core';
import type { Todo } from '../types/todo';

export async function getTodos(): Promise<Todo[]> {
  return await invoke<Todo[]>('get_todos');
}

export async function addTodo(content: string, priority: string): Promise<Todo> {
  return await invoke<Todo>('add_todo', { content, priority });
}

export async function toggleTodo(id: string, completed: boolean): Promise<void> {
  await invoke('toggle_todo', { id, completed });
}

export async function deleteTodo(id: string): Promise<void> {
  await invoke('delete_todo', { id });
}

export async function updateTodoContent(id: string, content: string): Promise<void> {
  await invoke('update_todo_content', { id, content });
}
