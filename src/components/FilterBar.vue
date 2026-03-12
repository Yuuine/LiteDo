<script setup lang="ts">
import { useTodoStore } from '../stores/todoStore';
import type { FilterType } from '../types/todo';

const store = useTodoStore();

const filters: { value: FilterType; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'active', label: '进行中' },
  { value: 'completed', label: '已完成' },
];
</script>

<template>
  <div class="filter-bar">
    <div class="filters">
      <button
        v-for="f in filters"
        :key="f.value"
        class="filter-btn"
        :class="{ active: store.filter === f.value }"
        @click="store.setFilter(f.value)"
      >
        {{ f.label }}
      </button>
    </div>
    <div class="stats">
      <span class="stat-item">
        共 {{ store.stats.total }} 项
      </span>
      <span class="stat-divider">|</span>
      <span class="stat-item">
        {{ store.stats.active }} 项待完成
      </span>
    </div>
  </div>
</template>

<style scoped>
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 16px;
}

.filters {
  display: flex;
  gap: 4px;
}

.filter-btn {
  padding: 6px 14px;
  border: none;
  border-radius: 16px;
  background: transparent;
  color: var(--text-muted);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn:hover {
  color: var(--text-primary);
}

.filter-btn.active {
  background: var(--accent-color);
  color: white;
}

.stats {
  font-size: 12px;
  color: var(--text-muted);
}

.stat-divider {
  margin: 0 8px;
  opacity: 0.5;
}
</style>
