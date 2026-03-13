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

  const selectedDateTodos = computed(() => {
    const { start, end } = selectedDateRange.value;
    return todos.value.filter(t => t.created_at >= start && t.created_at < end);
  });

  const filteredTodos = computed(() => {
    let filtered = selectedDateTodos.value;
    
    switch (filter.value) {
      case 'active':
        filtered = filtered.filter(t => !t.completed);
        break;
      case 'completed':
        filtered = filtered.filter(t => t.completed);
        break;
    }
    
    return filtered.sort((a, b) => {
      if (filter.value === 'all') {
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
      }
      return a.sort_order - b.sort_order;
    });
  });

  const stats = computed(() => ({
    total: todos.value.length,
    active: todos.value.filter(t => !t.completed).length,
    completed: todos.value.filter(t => t.completed).length,
  }));

  const selectedDateStats = computed(() => {
    const dayTodos = selectedDateTodos.value;
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
    const index = todos.value.findIndex(t => t.id === id);
    if (index === -1) {
      await logger.warn('Store', 'Todo not found for toggle', { id });
      return;
    }
    
    const todo = todos.value[index];
    
    await logger.debug('Store', 'toggleTodo called', { 
      id, 
      currentStatus: todo.completed,
      willChangeTo: !todo.completed 
    });
    
    try {
      const oldStatus = todo.completed;
      const newStatus = !todo.completed;
      
      await api.toggleTodo(id, newStatus);
      
      const updatedTodo = { ...todo };
      updatedTodo.completed = newStatus;
      updatedTodo.completed_at = newStatus ? Math.floor(Date.now() / 1000) : null;
      
      if (newStatus) {
        const { start, end } = selectedDateRange.value;
        const dayTodos = todos.value.filter(t => t.created_at >= start && t.created_at < end);
        const completedTodos = dayTodos.filter(t => t.completed && t.id !== id);
        
        if (completedTodos.length > 0) {
          const maxCompletedOrder = Math.max(...completedTodos.map(t => t.sort_order));
          updatedTodo.sort_order = maxCompletedOrder + 1;
        } else {
          const activeTodos = dayTodos.filter(t => !t.completed);
          if (activeTodos.length > 0) {
            const maxActiveOrder = Math.max(...activeTodos.map(t => t.sort_order));
            updatedTodo.sort_order = maxActiveOrder + 1;
          }
        }
        
        await api.updateTodoOrder(id, updatedTodo.sort_order);
      } else {
        const { start, end } = selectedDateRange.value;
        const dayTodos = todos.value.filter(t => t.created_at >= start && t.created_at < end);
        const activeTodos = dayTodos.filter(t => !t.completed && t.id !== id);
        
        if (activeTodos.length > 0) {
          const minActiveOrder = Math.min(...activeTodos.map(t => t.sort_order));
          updatedTodo.sort_order = minActiveOrder - 1;
        }
        
        await api.updateTodoOrder(id, updatedTodo.sort_order);
      }
      
      todos.value[index] = updatedTodo;
      todos.value = [...todos.value];
      
      await operation('任务管理', '任务', `${updatedTodo.completed ? '完成' : '重新打开'}任务: ${updatedTodo.content}`, '成功');
      await logger.info('Store', 'Todo toggled successfully', { 
        id, 
        oldStatus,
        newStatus: updatedTodo.completed,
        completedAt: updatedTodo.completed_at,
        newSortOrder: updatedTodo.sort_order
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

  function setFilter(newFilter: FilterType) {
    filter.value = newFilter;
  }

  function setSelectedDate(date: Date) {
    selectedDate.value = date;
  }

  return {
    todos,
    filter,
    selectedDate,
    isLoading,
    maxTodoLength,
    filteredTodos,
    stats,
    selectedDateStats,
    loadTodos,
    addTodoWithDate,
    toggleTodo,
    deleteTodo,
    setFilter,
    setSelectedDate,
  };
});
