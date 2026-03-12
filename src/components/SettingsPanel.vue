<script setup lang="ts">
import { ref, onMounted } from 'vue';
import OperationLogViewer from './OperationLogViewer.vue';

const emit = defineEmits<{
  close: [];
}>();

const settings = ref({
  notifications: true,
  autoStart: false,
  minimizeToTray: true,
});

const showOperationLog = ref(false);

onMounted(async () => {
  await loadSettings();
});

async function loadSettings() {
  try {
    const savedSettings = localStorage.getItem('app_settings');
    if (savedSettings) {
      settings.value = { ...settings.value, ...JSON.parse(savedSettings) };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
}

async function handleSave() {
  try {
    localStorage.setItem('app_settings', JSON.stringify(settings.value));
    console.log('Settings saved:', settings.value);
    emit('close');
  } catch (e) {
    console.error('Failed to save settings:', e);
    alert('保存设置失败: ' + e);
  }
}

function viewOperationLog() {
  showOperationLog.value = true;
}

async function openOperationLogLocation() {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const appDir = await invoke('get_app_data_dir');
    
    const operationLogPath = `${appDir}\\operation.log`;
    
    await invoke('open_file_location', { path: operationLogPath });
  } catch (e) {
    console.error('Failed to open operation log location:', e);
    alert('无法打开操作日志文件位置: ' + e);
  }
}

async function openDebugLogLocation() {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('open_log_file_location');
  } catch (e) {
    console.error('Failed to open debug log location:', e);
    alert('无法打开调试日志文件位置: ' + e);
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="settings-overlay" @click="emit('close')">
      <div class="settings-panel" @click.stop>
        <header class="settings-header">
          <h2>设置</h2>
          <button class="close-btn" @click="emit('close')" type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>
        
        <div class="settings-content">
          <section class="section">
            <h3 class="section-title">通用设置</h3>
            
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">启用通知</span>
                <span class="setting-desc">任务提醒时显示通知</span>
              </div>
              <label class="toggle">
                <input type="checkbox" v-model="settings.notifications" />
                <span class="toggle-slider"></span>
              </label>
            </div>
            
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">开机自启动</span>
                <span class="setting-desc">系统启动时自动运行应用</span>
              </div>
              <label class="toggle">
                <input type="checkbox" v-model="settings.autoStart" />
                <span class="toggle-slider"></span>
              </label>
            </div>
            
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">最小化到托盘</span>
                <span class="setting-desc">关闭窗口时最小化到系统托盘</span>
              </div>
              <label class="toggle">
                <input type="checkbox" v-model="settings.minimizeToTray" />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </section>
          
          <section class="section">
            <h3 class="section-title">日志管理</h3>
            
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">操作日志</span>
                <span class="setting-desc">记录用户的操作历史</span>
              </div>
              <div class="btn-group">
                <button class="btn-view-log" @click="viewOperationLog" type="button" title="查看操作日志">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  <span>查看</span>
                </button>
                <button class="btn-open-log" @click="openOperationLogLocation" type="button" title="在资源管理器中打开">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  </svg>
                  <span>打开位置</span>
                </button>
              </div>
            </div>
            
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">调试日志</span>
                <span class="setting-desc">记录系统运行详情（技术用）</span>
              </div>
              <button class="btn-open-log" @click="openDebugLogLocation" type="button" title="在资源管理器中打开">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
                <span>打开位置</span>
              </button>
            </div>
          </section>
        </div>
        
        <footer class="settings-footer">
          <button class="btn-save" @click="handleSave" type="button">保存设置</button>
        </footer>
      </div>
    </div>
    
    <OperationLogViewer v-if="showOperationLog" @close="showOperationLog = false" />
  </Teleport>
</template>

<style scoped>
.settings-overlay {
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

.settings-panel {
  background: var(--bg-primary);
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
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

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.settings-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.section {
  margin-bottom: 24px;
}

.section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-radius: 12px;
  margin-bottom: 8px;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.setting-desc {
  font-size: 12px;
  color: var(--text-muted);
}

.toggle {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 28px;
  flex-shrink: 0;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--border-color);
  transition: 0.3s;
  border-radius: 28px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

.toggle input:checked + .toggle-slider {
  background-color: var(--accent-color);
}

.toggle input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

.settings-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}

.btn-save {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 12px;
  background: var(--accent-color);
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-save:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn-open-log {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: var(--accent-color);
  color: white;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-open-log:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn-group {
  display: flex;
  gap: 8px;
}

.btn-view-log {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-view-log:hover {
  background: var(--bg-secondary);
  transform: translateY(-1px);
}
</style>
