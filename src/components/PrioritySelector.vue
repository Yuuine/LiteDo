<script setup lang="ts">
import { computed, ref } from 'vue';
import type { PriorityType } from '../types/todo';
import Icon from './Icon.vue';
import { getPriorityOptions, getPriorityLabel, getPriorityColor } from '../utils/priority';

const props = defineProps<{
  modelValue: PriorityType;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: PriorityType): void;
}>();

const showDropdown = ref(false);

const options = getPriorityOptions();

const currentLabel = computed(() => getPriorityLabel(props.modelValue));
const currentColor = computed(() => getPriorityColor(props.modelValue));

function toggleDropdown() {
  showDropdown.value = !showDropdown.value;
}

function selectPriority(priority: PriorityType) {
  emit('update:modelValue', priority);
  showDropdown.value = false;
}

function closeDropdown() {
  showDropdown.value = false;
}

defineExpose({ closeDropdown });
</script>

<template>
  <div class="priority-dropdown-wrapper">
    <button 
      type="button"
      class="priority-trigger"
      :style="{ color: currentColor }"
      @click="toggleDropdown"
    >
      {{ currentLabel }}
      <Icon name="chevron-down" :size="14" />
    </button>
    <div v-if="showDropdown" class="priority-dropdown">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="priority-option"
        :class="{ active: modelValue === option.value }"
        :style="{ color: option.color }"
        @click="selectPriority(option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.priority-dropdown-wrapper {
  position: relative;
  flex-shrink: 0;
  margin-left: 8px;
}

.priority-trigger {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border: none;
  border-radius: 8px;
  background: var(--bg-secondary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.priority-trigger:hover {
  background: var(--border-color);
}

.priority-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 100;
  min-width: 80px;
}

.priority-option {
  display: block;
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s;
}

.priority-option:hover {
  background: var(--bg-secondary);
}

.priority-option.active {
  background: var(--bg-secondary);
}
</style>
