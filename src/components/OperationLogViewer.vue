<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { getOperationLogs, type OperationLog } from '../utils/operationLogger';

const emit = defineEmits<{
  close: [];
}>();

const logs = ref<OperationLog[]>([]);
const isLoading = ref(true);

const recentLogs = computed(() => {
  return logs.value.slice(-30).reverse();
});

onMounted(async () => {
  await loadLogs();
});

async function loadLogs() {
  isLoading.value = true;
  logs.value = await getOperationLogs();
  isLoading.value = false;
}

function formatDate(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return timestamp;
  }
}

function getResultClass(result: string): string {
  return result === '成功' ? 'result-success' : 'result-fail';
}
</script>

<template>
  <Teleport to="body">
    <div class="log-viewer-overlay" @click="emit('close')">
      <div class="log-viewer-panel" @click.stop>
        <header class="log-viewer-header">
          <h2>操作日志</h2>
          <button class="close-btn" @click="emit('close')" type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>
        
        <div class="log-viewer-content">
          <div v-if="isLoading" class="loading">
            加载中...
          </div>
          
          <div v-else-if="recentLogs.length === 0" class="empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <p>暂无操作记录</p>
          </div>
          
          <div v-else class="log-list">
            <div 
              v-for="(log, index) in recentLogs" 
              :key="index"
              class="log-item"
            >
              <div class="log-header">
                <div class="log-time">{{ formatDate(log.timestamp) }}</div>
                <div class="log-type">{{ log.operation_type }}</div>
                <div class="log-result" :class="getResultClass(log.result)">
                  {{ log.result }}
                </div>
              </div>
              <div class="log-body">
                <div class="log-row">
                  <span class="log-label">对象：</span>
                  <span class="log-value">{{ log.operation_object }}</span>
                </div>
                <div class="log-row">
                  <span class="log-label">描述：</span>
                  <span class="log-value">{{ log.description }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <footer class="log-viewer-footer">
          <span class="log-count">最近 {{ recentLogs.length }} 条记录</span>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.log-viewer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.log-viewer-panel {
  background: var(--bg-primary);
  border-radius: 16px;
  width: 90%;
  max-width: 800px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  animation: slideUp 0.2s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.log-viewer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.log-viewer-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: var(--text-secondary);
  border-radius: 4px;
  transition: all 0.15s;
}

.close-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.log-viewer-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
  min-height: 300px;
}

.loading,
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: var(--text-secondary);
}

.empty svg {
  margin-bottom: 16px;
  opacity: 0.4;
}

.empty p {
  margin: 0;
  font-size: 14px;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.log-item {
  display: flex;
  flex-direction: column;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 12px;
  transition: all 0.15s;
  border: 1px solid transparent;
}

.log-item:hover {
  background: var(--bg-tertiary);
  border-color: var(--border-color);
}

.log-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.log-time {
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
}

.log-type {
  color: var(--accent-color);
  font-weight: 600;
  font-size: 13px;
  padding: 4px 10px;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 6px;
}

.log-result {
  margin-left: auto;
  text-align: center;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.result-success {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.result-fail {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.log-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.log-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.log-label {
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  min-width: 70px;
  flex-shrink: 0;
}

.log-value {
  color: var(--text-primary);
  font-size: 13px;
  word-break: break-word;
  flex: 1;
}

.log-viewer-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

.log-count {
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
