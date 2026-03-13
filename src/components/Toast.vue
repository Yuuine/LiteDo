<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const toasts = ref<Array<{ id: number; message: string; type: 'success' | 'error' | 'info' }>>([]);
let toastId = 0;

function addToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
  const id = ++toastId;
  toasts.value.push({ id, message, type });
  
  setTimeout(() => {
    removeToast(id);
  }, 2000);
}

function removeToast(id: number) {
  const index = toasts.value.findIndex(t => t.id === id);
  if (index !== -1) {
    toasts.value.splice(index, 1);
  }
}

const handleToastEvent = ((e: CustomEvent) => {
  addToast(e.detail.message, e.detail.type);
}) as EventListener;

onMounted(() => {
  window.addEventListener('toast', handleToastEvent);
});

onUnmounted(() => {
  window.removeEventListener('toast', handleToastEvent);
});

defineExpose({ addToast });
</script>

<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div 
          v-for="toast in toasts" 
          :key="toast.id" 
          class="toast"
          :class="toast.type"
        >
          {{ toast.message }}
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.toast {
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 14px;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideDown 0.3s ease;
  white-space: nowrap;
}

.toast.success {
  background: var(--success-color);
}

.toast.error {
  background: var(--danger-color);
}

.toast.info {
  background: var(--accent-color);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
