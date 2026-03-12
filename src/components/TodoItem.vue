<script setup lang="ts">
import type { Todo } from '../types/todo';
import { useTodoStore } from '../stores/todoStore';

const props = defineProps<{
  todo: Todo;
}>();

const store = useTodoStore();

const priorityLabels: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

const priorityColors: Record<string, string> = {
  low: 'var(--priority-low)',
  medium: 'var(--priority-medium)',
  high: 'var(--priority-high)',
};

function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}
</script>

<template>
  <div class="todo-item" :class="{ completed: todo.completed }">
    <label class="checkbox-wrapper">
      <input
        type="checkbox"
        :checked="todo.completed"
        @change="store.toggleTodo(todo.id)"
        class="checkbox"
      />
      <span class="checkmark"></span>
    </label>
    
    <div class="todo-content">
      <span class="todo-text">{{ todo.content }}</span>
      <div class="todo-meta">
        <span
          class="priority-badge"
          :style="{ backgroundColor: priorityColors[todo.priority] }"
        >
          {{ priorityLabels[todo.priority] }}
        </span>
        <span class="date">{{ formatDate(todo.created_at) }}</span>
      </div>
    </div>
    
    <button
      class="delete-btn"
      @click="store.deleteTodo(todo.id)"
      title="删除"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.todo-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--bg-secondary);
  border-radius: 10px;
  transition: all 0.2s;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.todo-item:hover {
  transform: translateX(4px);
}

.todo-item.completed {
  opacity: 0.6;
}

.todo-item.completed .todo-text {
  text-decoration: line-through;
  color: var(--text-muted);
}

.checkbox-wrapper {
  position: relative;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}

.checkbox {
  position: absolute;
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
  z-index: 1;
}

.checkmark {
  position: absolute;
  top: 0;
  left: 0;
  width: 22px;
  height: 22px;
  border: 2px solid var(--border-color);
  border-radius: 6px;
  transition: all 0.2s;
}

.checkbox:checked + .checkmark {
  background: var(--accent-color);
  border-color: var(--accent-color);
}

.checkbox:checked + .checkmark::after {
  content: '';
  position: absolute;
  left: 6px;
  top: 2px;
  width: 6px;
  height: 12px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.todo-content {
  flex: 1;
  min-width: 0;
}

.todo-text {
  display: block;
  font-size: 14px;
  color: var(--text-primary);
  word-break: break-word;
}

.todo-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.priority-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  color: white;
  font-weight: 500;
}

.date {
  font-size: 11px;
  color: var(--text-muted);
}

.delete-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.2s;
}

.todo-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: var(--danger-color);
  color: white;
}
</style>
