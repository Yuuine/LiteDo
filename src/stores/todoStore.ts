import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Todo, FilterType } from '../types/todo';
import * as api from '../services/api';
import logger, { operation } from '../utils/logger';

export const useTodoStore = defineStore('todo', () => {
  const todos = ref<Todo[]>([]);
  const filter = ref<FilterType>('all');
  const selectedDate = ref(new Date());
  const isLoading = ref(false);
  const isDragging = ref(false);
  const draggedId = ref<string | null>(null);
  const maxTodoLength = ref(30);

  function loadSettings() {
    try {
      const savedSettings = localStorage.getItem('app_settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        maxTodoLength.value = settings.maxTodoLength || 30;
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }

  loadSettings();

  const selectedDateRange = computed(() => {
    const date = selectedDate.value;
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return {
      start: Math.floor(start.getTime() / 1000),
      end: Math.floor(end.getTime() / 1000)
    };
  });

  const filteredTodos = computed(() => {
    const { start, end } = selectedDateRange.value;
    
    let filtered = todos.value.filter(t => t.created_at >= start && t.created_at < end);
    
    switch (filter.value) {
      case 'active':
        filtered = filtered.filter(t => !t.completed);
        break;
      case 'completed':
        filtered = filtered.filter(t => t.completed);
        break;
    }
    
    return filtered.sort((a, b) => a.sort_order - b.sort_order);
  });

  const stats = computed(() => ({
    total: todos.value.length,
    active: todos.value.filter(t => !t.completed).length,
    completed: todos.value.filter(t => t.completed).length,
  }));

  const selectedDateStats = computed(() => {
    const { start, end } = selectedDateRange.value;
    const dayTodos = todos.value.filter(t => t.created_at >= start && t.created_at < end);
    return {
      total: dayTodos.length,
      active: dayTodos.filter(t => !t.completed).length,
      completed: dayTodos.filter(t => t.completed).length,
    };
  });

  async function loadTodos() {
    isLoading.value = true;
    await logger.debug('Store', 'loadTodos started', { timestamp: new Date().toISOString() });
    try {
      todos.value = await api.getTodos();
      await logger.info('Store', 'Todos loaded successfully', { 
        count: todos.value.length,
        activeCount: todos.value.filter(t => !t.completed).length,
        completedCount: todos.value.filter(t => t.completed).length
      });
    } catch (e) {
      await logger.error('Store', 'Failed to load todos', { error: e, timestamp: new Date().toISOString() });
    } finally {
      isLoading.value = false;
    }
  }

  async function addTodoWithDate(content: string, createdAt: number) {
    await logger.debug('Store', 'addTodoWithDate called', { 
      content, 
      createdAt,
      contentLength: content.length,
      maxAllowed: maxTodoLength.value 
    });
    
    if (content.length > maxTodoLength.value) {
      const error = `待办事项字数超过限制（最多${maxTodoLength.value}字）`;
      await logger.warn('Store', 'Task content exceeds limit', { contentLength: content.length, maxAllowed: maxTodoLength.value });
      await operation('任务管理', '任务', `添加任务失败: 字数超限`, '失败');
      throw new Error(error);
    }
    
    try {
      const maxOrder = todos.value.reduce((max, t) => Math.max(max, t.sort_order), 0);
      const sortOrder = maxOrder + 1;
      await logger.debug('Store', 'Creating todo with sort order', { sortOrder, totalTodos: todos.value.length });
      
      const todo = await api.addTodoWithDate(content, sortOrder, createdAt);
      todos.value.unshift(todo);
      
      await operation('任务管理', '任务', `添加任务: ${content}`, '成功');
      await logger.info('Store', 'Todo added successfully', { 
        id: todo.id, 
        content,
        sortOrder,
        createdAt,
        totalTodos: todos.value.length
      });
      
      return todo;
    } catch (e) {
      await operation('任务管理', '任务', `添加任务失败: ${content}`, '失败');
      await logger.error('Store', 'addTodoWithDate failed', { error: e, content, createdAt });
      throw e;
    }
  }

  async function toggleTodo(id: string) {
    const todo = todos.value.find(t => t.id === id);
    if (!todo) {
      await logger.warn('Store', 'Todo not found for toggle', { id });
      return;
    }
    
    await logger.debug('Store', 'toggleTodo called', { 
      id, 
      currentStatus: todo.completed,
      willChangeTo: !todo.completed 
    });
    
    try {
      await api.toggleTodo(id, !todo.completed);
      const oldStatus = todo.completed;
      todo.completed = !todo.completed;
      todo.completed_at = todo.completed ? Math.floor(Date.now() / 1000) : null;
      
      await operation('任务管理', '任务', `${todo.completed ? '完成' : '重新打开'}任务: ${todo.content}`, '成功');
      await logger.info('Store', 'Todo toggled successfully', { 
        id, 
        oldStatus,
        newStatus: todo.completed,
        completedAt: todo.completed_at
      });
    } catch (e) {
      await operation('任务管理', '任务', `切换任务状态失败`, '失败');
      await logger.error('Store', 'Failed to toggle todo', { error: e, id, currentStatus: todo.completed });
    }
  }

  async function deleteTodo(id: string) {
    const todo = todos.value.find(t => t.id === id);
    if (!todo) {
      await logger.warn('Store', 'Todo not found for deletion', { id });
      return;
    }
    
    await logger.debug('Store', 'deleteTodo called', { 
      id, 
      content: todo.content,
      totalTodos: todos.value.length 
    });
    
    try {
      await api.deleteTodo(id);
      todos.value = todos.value.filter(t => t.id !== id);
      
      await operation('任务管理', '任务', `删除任务: ${todo.content}`, '成功');
      await logger.info('Store', 'Todo deleted successfully', { 
        id, 
        content: todo.content,
        remainingTodos: todos.value.length
      });
    } catch (e) {
      await operation('任务管理', '任务', `删除任务失败`, '失败');
      await logger.error('Store', 'Failed to delete todo', { error: e, id, content: todo.content });
    }
  }

  async function reorderTodos(fromIndex: number, toIndex: number) {
    const todoList = filteredTodos.value;
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    
    const movedTodo = todoList[fromIndex];
    if (!movedTodo) return;
    
    const newOrder = [...todoList];
    newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, movedTodo);
    
    const updates: Promise<void>[] = [];
    
    newOrder.forEach((todo, index) => {
      const newSortOrder = index;
      if (todo.sort_order !== newSortOrder) {
        todo.sort_order = newSortOrder;
        updates.push(api.updateTodoOrder(todo.id, newSortOrder));
      }
    });
    
    try {
      await Promise.all(updates);
      await logger.debug('Store', 'Todos reordered', { fromIndex, toIndex });
    } catch (e) {
      await logger.error('Store', 'Failed to reorder todos', e);
      await loadTodos();
    }
  }

  function setFilter(newFilter: FilterType) {
    filter.value = newFilter;
  }

  function setSelectedDate(date: Date) {
    selectedDate.value = date;
  }

  function setDragging(value: boolean, id: string | null = null) {
    isDragging.value = value;
    draggedId.value = id;
  }

  return {
    todos,
    filter,
    selectedDate,
    isLoading,
    isDragging,
    draggedId,
    maxTodoLength,
    filteredTodos,
    stats,
    selectedDateStats,
    loadTodos,
    addTodoWithDate,
    toggleTodo,
    deleteTodo,
    reorderTodos,
    setFilter,
    setSelectedDate,
    setDragging,
  };
});
