<script setup lang="ts">
defineProps<{
  type?: 'primary' | 'secondary' | 'danger' | 'text';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
}>();

defineEmits<{
  click: [];
}>();
</script>

<template>
  <button
    class="btn"
    :class="[`btn-${type || 'primary'}`, `btn-${size || 'medium'}`]"
    :disabled="disabled || loading"
    @click="$emit('click')"
  >
    <slot />
  </button>
</template>

<style scoped>
.btn {
  border: none;
  border-radius: 10px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
}

.btn-medium {
  padding: 10px 16px;
  font-size: 14px;
}

.btn-large {
  padding: 12px 24px;
  font-size: 16px;
}

.btn-primary {
  background: var(--accent-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn-secondary {
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--bg-secondary);
}

.btn-danger {
  background: var(--danger-color);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-text {
  background: none;
  color: var(--accent-color);
  padding: 0;
}

.btn-text:hover:not(:disabled) {
  opacity: 0.8;
}
</style>
