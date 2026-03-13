<script setup lang="ts">
import { ref } from 'vue';
import type { Todo } from '../types/todo';
import { useTodoStore } from '../stores/todoStore';
import ConfirmDialog from './ConfirmDialog.vue';
import { formatTime } from '../utils/dateUtils';

const props = defineProps<{
  todo: Todo;
}>();

const store = useTodoStore();
const showConfirm = ref(false);

function handleDelete() {
  showConfirm.value = true;
}

function confirmDelete() {
  store.deleteTodo(props.todo.id);
  showConfirm.value = false;
}
</script>

<template>
  <div 
    class="todo-item" 
    :class="{ completed: todo.completed }"
    @click="store.toggleTodo(todo.id)"
    >
    <label class="checkbox-wrapper" @click.stop>
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
      <span class="time">{{ formatTime(todo.created_at) }}</span>
    </div>
    
    <button class="delete-btn" @click.stop="handleDelete" title="删除">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    </button>
    
    <ConfirmDialog
      v-if="showConfirm"
      title="删除确认"
      message="确定要删除这条待办事项吗？"
      @confirm="confirmDelete"
      @cancel="showConfirm = false"
    />
  </div>
</template>

<style scoped>
.todo-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: var(--bg-primary);
  border-radius: 12px;
  transition: all 0.2s;
  border: 1px solid var(--border-color);
  width: 100%;
  box-sizing: border-box;
  cursor: pointer;
}

.todo-item:hover {
  border-color: var(--accent-color);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.1);
}

.todo-item.completed .todo-text {
  text-decoration: line-through;
  text-decoration-thickness: 1.5px;
  color: var(--text-muted);
  opacity: 0.8;
}

.checkbox-wrapper {
  position: relative;
  width: 20px;
  height: 20px;
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
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-color);
  border-radius: 50%;
  transition: all 0.2s;
}

.todo-item:hover .checkmark {
  border-color: var(--accent-color);
}

.checkbox:checked + .checkmark {
  background: var(--success-color);
  border-color: var(--success-color);
}

.checkbox:checked + .checkmark::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 5px;
  height: 9px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: translate(-50%, -60%) rotate(45deg);
}

.todo-content {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.todo-text {
  display: block;
  font-size: 14px;
  color: var(--text-primary);
  word-break: break-word;
  line-height: 1.4;
}

.time {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
}

.delete-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.2s;
  flex-shrink: 0;
}

.todo-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: var(--danger-color);
  color: white;
}
</style>
