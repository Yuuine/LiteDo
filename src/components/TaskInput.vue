<script setup lang="ts">
import { ref } from 'vue';
import type { PriorityType } from '../types/todo';
import Icon from './Icon.vue';
import PrioritySelector from './PrioritySelector.vue';
import { getDefaultPriority } from '../utils/priority';

const { disabled = false, showPriority = false } = defineProps<{
  disabled?: boolean;
  showPriority?: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', content: string, priority: PriorityType): void;
}>();

const content = ref('');
const priority = ref<PriorityType>(getDefaultPriority());
const inputRef = ref<HTMLInputElement | null>(null);

function handleSubmit(): void {
  const trimmed = content.value.trim();
  if (!trimmed) return;
  
  emit('submit', trimmed, priority.value);
  content.value = '';
  priority.value = getDefaultPriority();
}

function focus(): void {
  inputRef.value?.focus();
}

defineExpose({ focus });
</script>

<template>
  <form class="task-input-form" @submit.prevent="handleSubmit">
    <div class="input-wrapper">
      <Icon name="plus" :size="18" class="input-icon" />
      <input
        ref="inputRef"
        v-model="content"
        type="text"
        placeholder="添加新任务，按回车发送"
        class="task-input"
        :disabled="disabled"
      />
      <PrioritySelector
        v-if="showPriority"
        v-model="priority"
      />
    </div>
  </form>
</template>

<style scoped>
.task-input-form {
  display: flex;
  width: 100%;
}

.input-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: 0 12px;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.input-wrapper:focus-within {
  border-color: var(--accent-color);
  box-shadow: 0 4px 16px var(--accent-color-alpha);
}

.input-icon {
  color: var(--text-muted);
  flex-shrink: 0;
  margin-right: 10px;
}

.task-input {
  flex: 1;
  padding: 12px 0;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  min-width: 0;
}

.task-input::placeholder {
  color: var(--text-muted);
}

.task-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
