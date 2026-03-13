<script setup lang="ts">
import { computed } from 'vue';
import { PRIORITY_CONFIG } from '../../constants/model';
import type { PriorityType } from '../../types/todo';

const props = defineProps<{
  priority: PriorityType;
  size?: 'small' | 'medium';
}>();

const priorityInfo = computed(() => PRIORITY_CONFIG[props.priority] || PRIORITY_CONFIG.medium);
</script>

<template>
  <span 
    class="priority-badge"
    :class="[`priority-${props.priority}`, `size-${size || 'small'}`]"
    :style="{ color: priorityInfo.color }"
  >
    {{ priorityInfo.label }}
  </span>
</template>

<style scoped>
.priority-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  border-radius: 4px;
}

.priority-high {
  background: rgba(239, 68, 68, 0.1);
}

.priority-medium {
  background: rgba(245, 158, 11, 0.1);
}

.priority-low {
  background: rgba(34, 197, 94, 0.1);
}

.size-small {
  font-size: 12px;
  padding: 2px 6px;
}

.size-medium {
  font-size: 13px;
  padding: 4px 8px;
}
</style>
