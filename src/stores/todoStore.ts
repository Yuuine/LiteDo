import { defineStore } from 'pinia';
import { ref, computed, shallowRef } from 'vue';
import type { Todo, FilterType, PriorityType } from '../types/todo';
import { STORAGE_KEYS, PRIORITY_ORDER, DEFAULT_FONT_THEME } from '../constants/model';
import * as api from '../services/api';
import logger, { operation } from '../utils/logger';
import { getDateRange } from '../utils/dateUtils';

export type FontThemeKey = 'system' | 'sf' | 'roboto' | 'noto' | 'serif' | 'mono';

interface AppSettings {
  autoStart: boolean;
  themeColor: string;
  priorityEnabled: boolean;
  sortByPriority: boolean;
  fontTheme: FontThemeKey;
}

const DEFAULT_SETTINGS: AppSettings = {
  autoStart: false,
  themeColor: '#6366f1',
  priorityEnabled: false,
  sortByPriority: false,
  fontTheme: DEFAULT_FONT_THEME as FontThemeKey,
};

function loadAppSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return DEFAULT_SETTINGS;
}

function saveAppSettings(settings: AppSettings): void {
  try {
    const existing = localStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
    const existingSettings = existing ? JSON.parse(existing) : {};
    const merged = { ...existingSettings, ...settings };
    localStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(merged));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export const useTodoStore = defineStore('todo', () => {
  const todos = shallowRef<Todo[]>([]);
  const filter = ref<FilterType>('all');
  const selectedDate = ref(new Date());
  const isLoading = ref(false);
  
  const settings = ref<AppSettings>(loadAppSettings());
  
  const priorityEnabled = computed({
    get: () => settings.value.priorityEnabled,
    set: (value) => {
      settings.value.priorityEnabled = value;
      saveAppSettings(settings.value);
    },
  });
  
  const sortByPriority = computed({
    get: () => settings.value.sortByPriority,
    set: (value) => {
      settings.value.sortByPriority = value;
      saveAppSettings(settings.value);
    },
  });

  const todoMap = computed(() => {
    const map = new Map<string, Todo>();
    for (const todo of todos.value) {
      map.set(todo.id, todo);
    }
    return map;
  });

  const selectedDateRange = computed(() => getDateRange(selectedDate.value));

  const selectedDateTodos = computed(() => {
    const { start, end } = selectedDateRange.value;
    return todos.value.filter(t => t.created_at >= start && t.created_at < end);
  });

  function sortTodos(todoList: Todo[]): Todo[] {
    return [...todoList].sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      if (sortByPriority.value && priorityEnabled.value) {
        const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
      }
      return a.sort_order - b.sort_order;
    });
  }

  const filteredTodos = computed(() => {
    const dayTodos = selectedDateTodos.value;
    
    let filtered: Todo[];
    switch (filter.value) {
      case 'active':
        filtered = dayTodos.filter(t => !t.completed);
        break;
      case 'completed':
        filtered = dayTodos.filter(t => t.completed);
        break;
      default:
        filtered = dayTodos;
    }
    
    return sortTodos(filtered);
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

  async function loadTodos(): Promise<void> {
    isLoading.value = true;
    await logger.debug('Store', 'loadTodos started', { timestamp: new Date().toISOString() });
    
    try {
      todos.value = await api.getTodos();
      await logger.info('Store', 'Todos loaded successfully', { 
        count: todos.value.length,
        activeCount: selectedDateStats.value.active,
        completedCount: selectedDateStats.value.completed,
      });
    } catch (e) {
      await logger.error('Store', 'Failed to load todos', { error: e, timestamp: new Date().toISOString() });
    } finally {
      isLoading.value = false;
    }
  }

  async function addTodoWithDate(content: string, createdAt: number, priority: PriorityType = 'medium'): Promise<Todo> {
    await logger.debug('Store', 'addTodoWithDate called', { content, createdAt, priority });
    
    try {
      const maxOrder = todos.value.reduce((max, t) => Math.max(max, t.sort_order), 0);
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
        totalTodos: todos.value.length,
      });
      
      return todo;
    } catch (e) {
      await operation('任务管理', '任务', `添加任务失败: ${content}`, '失败');
      await logger.error('Store', 'addTodoWithDate failed', { error: e, content, createdAt });
      throw e;
    }
  }

  function getTodoById(id: string): Todo | undefined {
    return todoMap.value.get(id);
  }

  async function toggleTodo(id: string): Promise<void> {
    const todo = getTodoById(id);
    if (!todo) {
      await logger.warn('Store', 'Todo not found for toggle', { id });
      return;
    }
    
    await logger.debug('Store', 'toggleTodo called', { 
      id, 
      currentStatus: todo.completed,
      willChangeTo: !todo.completed,
    });
    
    try {
      const newStatus = !todo.completed;
      await api.toggleTodo(id, newStatus);
      
      const updatedTodo: Todo = {
        ...todo,
        completed: newStatus,
        completed_at: newStatus ? Math.floor(Date.now() / 1000) : null,
      };
      
      if (newStatus) {
        const { start, end } = selectedDateRange.value;
        const dayTodos = todos.value.filter(
          t => t.created_at >= start && t.created_at < end && t.id !== id
        );
        
        const maxCompletedOrder = dayTodos
          .filter(t => t.completed)
          .reduce((max, t) => Math.max(max, t.sort_order), 0);
        const maxActiveOrder = dayTodos
          .filter(t => !t.completed)
          .reduce((max, t) => Math.max(max, t.sort_order), 0);
        
        updatedTodo.sort_order = maxCompletedOrder > 0 
          ? maxCompletedOrder + 1 
          : (maxActiveOrder > 0 ? maxActiveOrder + 1 : 1);
        await api.updateTodoOrder(id, updatedTodo.sort_order);
      } else {
        const { start, end } = selectedDateRange.value;
        const activeTodos = todos.value.filter(
          t => t.created_at >= start && t.created_at < end && !t.completed && t.id !== id
        );
        
        const minActiveOrder = activeTodos.reduce(
          (min, t) => Math.min(min, t.sort_order), 
          Infinity
        );
        
        updatedTodo.sort_order = minActiveOrder !== Infinity ? minActiveOrder - 1 : 1;
        await api.updateTodoOrder(id, updatedTodo.sort_order);
      }
      
      todos.value = todos.value.map(t => t.id === id ? updatedTodo : t);
      
      await operation('任务管理', '任务', `${updatedTodo.completed ? '完成' : '重新打开'}任务: ${updatedTodo.content}`, '成功');
      await logger.info('Store', 'Todo toggled successfully', { 
        id, 
        oldStatus: todo.completed,
        newStatus: updatedTodo.completed,
        completedAt: updatedTodo.completed_at,
        newSortOrder: updatedTodo.sort_order,
      });
    } catch (e) {
      await operation('任务管理', '任务', '切换任务状态失败', '失败');
      await logger.error('Store', 'Failed to toggle todo', { error: e, id, currentStatus: todo.completed });
    }
  }

  async function deleteTodo(id: string): Promise<void> {
    const todo = getTodoById(id);
    if (!todo) {
      await logger.warn('Store', 'Todo not found for deletion', { id });
      return;
    }
    
    await logger.debug('Store', 'deleteTodo called', { 
      id, 
      content: todo.content,
      totalTodos: todos.value.length,
    });
    
    try {
      await api.deleteTodo(id);
      todos.value = todos.value.filter(t => t.id !== id);
      
      await operation('任务管理', '任务', `删除任务: ${todo.content}`, '成功');
      await logger.info('Store', 'Todo deleted successfully', { 
        id, 
        content: todo.content,
        remainingTodos: todos.value.length,
      });
    } catch (e) {
      await operation('任务管理', '任务', '删除任务失败', '失败');
      await logger.error('Store', 'Failed to delete todo', { error: e, id, content: todo.content });
    }
  }

  async function updateTodoContent(id: string, newContent: string): Promise<void> {
    const todo = getTodoById(id);
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
      await operation('任务管理', '任务', '编辑任务失败', '失败');
      await logger.error('Store', 'Failed to update todo content', { error: e, id });
      throw e;
    }
  }

  function setFilter(newFilter: FilterType): void {
    filter.value = newFilter;
  }

  function setSelectedDate(date: Date): void {
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
