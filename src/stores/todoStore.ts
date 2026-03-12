import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Todo, FilterType } from '../types/todo';
import * as api from '../services/api';

export const useTodoStore = defineStore('todo', () => {
  const todos = ref<Todo[]>([]);
  const filter = ref<FilterType>('all');
  const isLoading = ref(false);

  const filteredTodos = computed(() => {
    switch (filter.value) {
      case 'active':
        return todos.value.filter(t => !t.completed);
      case 'completed':
        return todos.value.filter(t => t.completed);
      default:
        return todos.value;
    }
  });

  const stats = computed(() => ({
    total: todos.value.length,
    active: todos.value.filter(t => !t.completed).length,
    completed: todos.value.filter(t => t.completed).length,
  }));

  async function loadTodos() {
    isLoading.value = true;
    try {
      todos.value = await api.getTodos();
    } catch (e) {
      console.error('Failed to load todos:', e);
    } finally {
      isLoading.value = false;
    }
  }

  async function addTodo(content: string, priority: 'low' | 'medium' | 'high' = 'medium') {
    try {
      const todo = await api.addTodo(content, priority);
      todos.value.unshift(todo);
    } catch (e) {
      console.error('Failed to add todo:', e);
    }
  }

  async function toggleTodo(id: string) {
    const todo = todos.value.find(t => t.id === id);
    if (!todo) return;
    
    try {
      await api.toggleTodo(id, !todo.completed);
      todo.completed = !todo.completed;
      todo.completed_at = todo.completed ? Date.now() : null;
    } catch (e) {
      console.error('Failed to toggle todo:', e);
    }
  }

  async function deleteTodo(id: string) {
    try {
      await api.deleteTodo(id);
      todos.value = todos.value.filter(t => t.id !== id);
    } catch (e) {
      console.error('Failed to delete todo:', e);
    }
  }

  function setFilter(newFilter: FilterType) {
    filter.value = newFilter;
  }

  return {
    todos,
    filter,
    isLoading,
    filteredTodos,
    stats,
    loadTodos,
    addTodo,
    toggleTodo,
    deleteTodo,
    setFilter,
  };
});
