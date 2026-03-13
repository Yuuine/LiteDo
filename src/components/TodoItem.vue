<script setup lang="ts">
import { ref, nextTick } from 'vue';
import type { Todo } from '../types/todo';
import { useTodoStore } from '../stores/todoStore';
import ConfirmDialog from './ConfirmDialog.vue';
import Icon from './Icon.vue';
import { formatTime } from '../utils/dateUtils';
import { showToast } from '../utils/toast';
import { getPriorityLabel } from '../utils/priority';

const props = defineProps<{
  todo: Todo;
}>();

const store = useTodoStore();
const showConfirm = ref(false);
const isEditing = ref(false);
const editContent = ref('');
const editInput = ref<HTMLInputElement | null>(null);

function handleDelete(): void {
  showConfirm.value = true;
}

function confirmDelete(): void {
  store.deleteTodo(props.todo.id);
  showConfirm.value = false;
  showToast('删除成功', 'success');
}

function startEdit(): void {
  editContent.value = props.todo.content;
  isEditing.value = true;
  nextTick(() => {
    editInput.value?.focus();
    editInput.value?.select();
  });
}

function cancelEdit(): void {
  isEditing.value = false;
  editContent.value = '';
}

async function handleBlur(): Promise<void> {
  const trimmedContent = editContent.value.trim();
  
  if (!trimmedContent) {
    showToast('任务内容不能为空', 'error');
    editContent.value = props.todo.content;
    isEditing.value = false;
    return;
  }
  
  if (trimmedContent === props.todo.content) {
    isEditing.value = false;
    return;
  }
  
  try {
    await store.updateTodoContent(props.todo.id, trimmedContent);
    showToast('修改成功', 'success');
    isEditing.value = false;
  } catch {
    showToast('修改失败', 'error');
    editContent.value = props.todo.content;
    isEditing.value = false;
  }
}

function handleEditKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    cancelEdit();
  }
}
</script>

<template>
  <div 
    class="todo-item" 
    :class="{ completed: todo.completed }"
    @click="!isEditing && store.toggleTodo(todo.id)"
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
      <template v-if="isEditing">
        <input
          ref="editInput"
          v-model="editContent"
          type="text"
          class="edit-input"
          @keydown="handleEditKeydown"
          @blur="handleBlur"
          @click.stop
        />
      </template>
      <template v-else>
        <span class="todo-text">{{ todo.content }}</span>
      </template>
    </div>
    
    <div class="todo-meta" v-if="!isEditing">
      <span 
        v-if="store.priorityEnabled" 
        class="priority-indicator"
        :class="todo.priority"
      >
        {{ getPriorityLabel(todo.priority) }}
      </span>
      <span class="time">{{ formatTime(todo.created_at) }}</span>
      <div class="action-buttons">
        <button class="edit-btn" @click.stop="startEdit" title="编辑" type="button">
          <Icon name="edit" :size="12" />
        </button>
        <button class="delete-btn" @click.stop="handleDelete" title="删除" type="button">
          <Icon name="close" :size="12" />
        </button>
      </div>
    </div>
    
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
  gap: 12px;
  padding: 10px 14px;
  background: transparent;
  border-radius: 8px;
  transition: all 0.2s;
  border-bottom: 1px solid var(--border-color);
  width: 100%;
  box-sizing: border-box;
  cursor: pointer;
}

.todo-item:hover {
  background: var(--bg-primary);
}

.todo-item:hover .action-buttons {
  opacity: 1;
}

.todo-item:last-child {
  border-bottom: none;
}

.todo-item.completed .todo-text {
  text-decoration: line-through;
  text-decoration-thickness: 1px;
  color: var(--text-muted);
  opacity: 0.7;
}

.checkbox-wrapper {
  position: relative;
  width: 18px;
  height: 18px;
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
  width: 18px;
  height: 18px;
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
  width: 4px;
  height: 8px;
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

.todo-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.time {
  font-size: 11px;
  color: var(--text-muted);
}

.priority-indicator {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
}

.priority-indicator.high {
  color: var(--danger-color);
}

.priority-indicator.medium {
  color: var(--warning-color);
}

.priority-indicator.low {
  color: var(--success-color);
}

.edit-input {
  width: 100%;
  padding: 6px 10px;
  border: 2px solid var(--accent-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
}

.action-buttons {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;
}

.edit-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
}

.edit-btn:hover {
  background: var(--accent-color);
  color: white;
}

.delete-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
}

.delete-btn:hover {
  background: var(--danger-color);
  color: white;
}
</style>
