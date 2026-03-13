import { defineStore } from 'pinia';
import { ref, computed, shallowRef } from 'vue';
import type { Todo, FilterType, PriorityType } from '../types/todo';
import * as api from '../services/api';
import logger, { operation } from '../utils/logger';

function getStartOfDay(date: Date): number {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor(d.getTime() / 1000);
}

export const useTodoStore = defineStore('todo', () => {
  const todos = shallowRef<Todo[]>([]);
  const filter = ref<FilterType>('all');
  const selectedDate = ref(new Date());
  const isLoading = ref(false);
  const priorityEnabled = ref(false);
  const sortByPriority = ref(false);

  const todoMap = computed(() => {
    const map = new Map<string, Todo>();
    for (const todo of todos.value) {
      map.set(todo.id, todo);
    }
    return map;
  });

  function loadSettings() {
    try {
      const savedSettings = localStorage.getItem('app_settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        priorityEnabled.value = settings.priorityEnabled ?? false;
        sortByPriority.value = settings.sortByPriority ?? false;
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }

  loadSettings();

  const selectedDateRange = computed(() => {
    const start = getStartOfDay(selectedDate.value);
    return {
      start,
      end: start + 86400
    };
  });

  const selectedDateTodos = computed(() => {
    const { start, end } = selectedDateRange.value;
    return todos.value.filter(t => t.created_at >= start && t.created_at < end);
  });

  const filteredTodos = computed(() => {
    const dayTodos = selectedDateTodos.value;
    
    let filtered: Todo[];
    if (filter.value === 'active') {
      filtered = dayTodos.filter(t => !t.completed);
    } else if (filter.value === 'completed') {
      filtered = dayTodos.filter(t => t.completed);
    } else {
      filtered = [...dayTodos];
    }
    
    if (sortByPriority.value && priorityEnabled.value) {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      filtered.sort((a, b) => {
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.sort_order - b.sort_order;
      });
    } else {
      filtered.sort((a, b) => {
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        return a.sort_order - b.sort_order;
      });
    }
    
    return filtered;
  });

  const stats = computed(() => {
    let active = 0;
    let completed = 0;
    for (const todo of todos.value) {
      if (todo.completed) {
        completed++;
      } else {
        active++;
      }
    }
    return { total: todos.value.length, active, completed };
  });

  const selectedDateStats = computed(() => {
    const dayTodos = selectedDateTodos.value;
    let active = 0;
    let completed = 0;
    for (const todo of dayTodos) {
      if (todo.completed) {
        completed++;
      } else {
        active++;
      }
    }
    return { total: dayTodos.length, active, completed };
  });

  async function loadTodos() {
    isLoading.value = true;
    await logger.debug('Store', 'loadTodos started', { timestamp: new Date().toISOString() });
    try {
      todos.value = await api.getTodos();
      await logger.info('Store', 'Todos loaded successfully', { 
        count: todos.value.length,
        activeCount: stats.value.active,
        completedCount: stats.value.completed
      });
    } catch (e) {
      await logger.error('Store', 'Failed to load todos', { error: e, timestamp: new Date().toISOString() });
    } finally {
      isLoading.value = false;
    }
  }

  async function addTodoWithDate(content: string, createdAt: number, priority: PriorityType = 'medium') {
    await logger.debug('Store', 'addTodoWithDate called', { 
      content, 
      createdAt,
      priority,
    });
    
    try {
      let maxOrder = 0;
      for (const t of todos.value) {
        if (t.sort_order > maxOrder) maxOrder = t.sort_order;
      }
      const sortOrder = maxOrder + 1;
      await logger.debug('Store', 'Creating todo with sort order', { sortOrder, totalTodos: todos.value.length });
      
      const todo = await api.addTodoWithDate(content, sortOrder, createdAt, priority);
      todos.value = [todo, ...todos.value];
      
      await operation('任务管理', '任务', `添加任务: ${content}`, '成功');
      await logger.info('Store', 'Todo added successfully', { 
        id: todo.id, 
        content,
        priority,
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
    const todo = todoMap.value.get(id);
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
      const oldStatus = todo.completed;
      const newStatus = !todo.completed;
      
      await api.toggleTodo(id, newStatus);
      
      const updatedTodo: Todo = {
        ...todo,
        completed: newStatus,
        completed_at: newStatus ? Math.floor(Date.now() / 1000) : null,
      };
      
      if (newStatus) {
        const { start, end } = selectedDateRange.value;
        let maxCompletedOrder = 0;
        let maxActiveOrder = 0;
        
        for (const t of todos.value) {
          if (t.created_at >= start && t.created_at < end && t.id !== id) {
            if (t.completed && t.sort_order > maxCompletedOrder) {
              maxCompletedOrder = t.sort_order;
            } else if (!t.completed && t.sort_order > maxActiveOrder) {
              maxActiveOrder = t.sort_order;
            }
          }
        }
        
        updatedTodo.sort_order = maxCompletedOrder > 0 ? maxCompletedOrder + 1 : (maxActiveOrder > 0 ? maxActiveOrder + 1 : 1);
        await api.updateTodoOrder(id, updatedTodo.sort_order);
      } else {
        const { start, end } = selectedDateRange.value;
        let minActiveOrder = Infinity;
        
        for (const t of todos.value) {
          if (t.created_at >= start && t.created_at < end && !t.completed && t.id !== id) {
            if (t.sort_order < minActiveOrder) {
              minActiveOrder = t.sort_order;
            }
          }
        }
        
        updatedTodo.sort_order = minActiveOrder !== Infinity ? minActiveOrder - 1 : 1;
        await api.updateTodoOrder(id, updatedTodo.sort_order);
      }
      
      todos.value = todos.value.map(t => t.id === id ? updatedTodo : t);
      
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
    const todo = todoMap.value.get(id);
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

  async function updateTodoContent(id: string, newContent: string) {
    const todo = todoMap.value.get(id);
    if (!todo) {
      await logger.warn('Store', 'Todo not found for update', { id });
      return;
    }
    
    await logger.debug('Store', 'updateTodoContent called', { 
      id, 
      oldContent: todo.content,
      newContent,
    });
    
    try {
      await api.updateTodoContent(id, newContent);
      todos.value = todos.value.map(t => 
        t.id === id ? { ...t, content: newContent } : t
      );
      
      await operation('任务管理', '任务', `编辑任务: ${newContent}`, '成功');
      await logger.info('Store', 'Todo content updated successfully', { 
        id, 
        oldContent: todo.content,
        newContent,
      });
    } catch (e) {
      await operation('任务管理', '任务', `编辑任务失败`, '失败');
      await logger.error('Store', 'Failed to update todo content', { error: e, id });
      throw e;
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
    priorityEnabled,
    sortByPriority,
    filteredTodos,
    stats,
    selectedDateStats,
    loadTodos,
    addTodoWithDate,
    toggleTodo,
    deleteTodo,
    updateTodoContent,
    setFilter,
    setSelectedDate,
  };
});
