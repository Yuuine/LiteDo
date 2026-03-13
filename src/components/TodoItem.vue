<script setup lang="ts">
import { ref, nextTick } from 'vue';
import type { Todo } from '../types/todo';
import { useTodoStore } from '../stores/todoStore';
import ConfirmDialog from './ConfirmDialog.vue';
import Icon from './Icon.vue';
import { formatTime } from '../utils/dateUtils';
import { showToast } from '../utils/toast';

const props = defineProps<{
  todo: Todo;
}>();

const store = useTodoStore();
const showConfirm = ref(false);
const isEditing = ref(false);
const editContent = ref('');
const editInput = ref<HTMLInputElement | null>(null);

function handleDelete() {
  showConfirm.value = true;
}

function confirmDelete() {
  store.deleteTodo(props.todo.id);
  showConfirm.value = false;
  showToast('删除成功', 'success');
}

function startEdit() {
  editContent.value = props.todo.content;
  isEditing.value = true;
  nextTick(() => {
    editInput.value?.focus();
    editInput.value?.select();
  });
}

function cancelEdit() {
  isEditing.value = false;
  editContent.value = '';
}

async function handleBlur() {
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
  } catch (e) {
    showToast('修改失败', 'error');
    editContent.value = props.todo.content;
    isEditing.value = false;
  }
}

function handleEditKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    cancelEdit();
  }
}

const priorityLabels: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低'
};
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
        <div class="todo-meta">
          <span class="time">{{ formatTime(todo.created_at) }}</span>
          <span 
            v-if="store.priorityEnabled" 
            class="priority-badge" 
            :class="todo.priority"
          >
            {{ priorityLabels[todo.priority] }}
          </span>
        </div>
      </template>
    </div>
    
    <div v-if="!isEditing" class="action-buttons">
      <button class="edit-btn" @click.stop="startEdit" title="编辑" type="button">
        <Icon name="edit" :size="14" />
      </button>
      <button class="delete-btn" @click.stop="handleDelete" title="删除" type="button">
        <Icon name="close" :size="14" />
      </button>
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
  box-shadow: 0 2px 8px var(--accent-color-alpha);
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
  display: flex;
  flex-direction: column;
  gap: 4px;
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
}

.time {
  font-size: 11px;
  color: var(--text-muted);
}

.priority-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.priority-badge.high {
  background: rgba(239, 68, 68, 0.15);
  color: var(--danger-color);
}

.priority-badge.medium {
  background: rgba(245, 158, 11, 0.15);
  color: var(--warning-color);
}

.priority-badge.low {
  background: rgba(34, 197, 94, 0.15);
  color: var(--success-color);
}

.edit-input {
  width: 100%;
  padding: 8px 12px;
  border: 2px solid var(--accent-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
}

.action-buttons {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.edit-btn {
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

.todo-item:hover .edit-btn {
  opacity: 1;
}

.edit-btn:hover {
  background: var(--accent-color);
  color: white;
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
