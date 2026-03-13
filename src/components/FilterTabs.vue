<script setup lang="ts">
import type { FilterType } from '../types/todo';

const { modelValue, stats } = defineProps<{
  modelValue: FilterType;
  stats: {
    total: number;
    active: number;
    completed: number;
  };
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: FilterType): void;
}>();

const tabs: { value: FilterType; label: string; countKey: 'total' | 'active' | 'completed' }[] = [
  { value: 'all', label: '全部', countKey: 'total' },
  { value: 'active', label: '待办', countKey: 'active' },
  { value: 'completed', label: '完成', countKey: 'completed' },
];

function setFilter(value: FilterType): void {
  emit('update:modelValue', value);
}
</script>

<template>
  <nav class="filter-tabs">
    <button 
      v-for="tab in tabs"
      :key="tab.value"
      class="tab" 
      :class="{ active: modelValue === tab.value }" 
      @click="setFilter(tab.value)"
      type="button"
    >
      {{ tab.label }}
      <span 
        v-if="stats[tab.countKey] > 0" 
        class="tab-count"
        :class="{ 'active-count': tab.value === 'active' }"
      >
        {{ stats[tab.countKey] }}
      </span>
    </button>
  </nav>
</template>

<style scoped>
.filter-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 12px;
  background: var(--bg-primary);
  border-radius: 10px;
  padding: 4px;
  flex-shrink: 0;
  border: 1px solid var(--border-color);
}

.tab {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.tab:hover {
  color: var(--text-primary);
}

.tab.active {
  background: var(--accent-color);
  color: white;
}

.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  font-size: 11px;
  font-weight: 600;
  background: var(--bg-secondary);
  color: var(--text-muted);
  line-height: 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.tab.active .tab-count {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.active-count {
  background: var(--danger-color);
  color: white;
}

.tab.active .active-count {
  background: rgba(255, 255, 255, 0.3);
}
</style>
