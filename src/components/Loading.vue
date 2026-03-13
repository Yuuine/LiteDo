<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import Icon from './Icon.vue';

const visible = ref(false);
let loadingCount = 0;

function show() {
  loadingCount++;
  visible.value = true;
}

function hide() {
  loadingCount = Math.max(0, loadingCount - 1);
  if (loadingCount === 0) {
    visible.value = false;
  }
}

const handleShowEvent = (() => show()) as EventListener;
const handleHideEvent = (() => hide()) as EventListener;

onMounted(() => {
  window.addEventListener('loading-show', handleShowEvent);
  window.addEventListener('loading-hide', handleHideEvent);
});

onUnmounted(() => {
  window.removeEventListener('loading-show', handleShowEvent);
  window.removeEventListener('loading-hide', handleHideEvent);
});

defineExpose({ show, hide });
</script>

<template>
  <Teleport to="body">
    <Transition name="loading">
      <div v-if="visible" class="loading-overlay">
        <div class="loading-spinner">
          <Icon name="loading" :size="32" color="var(--accent-color)" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
}

.loading-spinner {
  background: var(--bg-primary);
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.loading-enter-active,
.loading-leave-active {
  transition: opacity 0.2s ease;
}

.loading-enter-from,
.loading-leave-to {
  opacity: 0;
}
</style>
