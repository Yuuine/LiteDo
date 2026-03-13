<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useTodoStore } from '../stores/todoStore';
import { useModelStore } from '../stores/modelStore';
import OperationLogViewer from './OperationLogViewer.vue';
import ConfirmDialog from './ConfirmDialog.vue';
import { operation, system } from '../utils/logger';
import type { ModelConfig, UpdateModelInput } from '../types/model';

function showToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
  window.dispatchEvent(new CustomEvent('toast', { detail: { message, type } }));
}

const emit = defineEmits<{
  close: [];
}>();

const store = useTodoStore();
const modelStore = useModelStore();

const activeTab = ref<'general' | 'model'>('general');

const settings = ref({
  autoStart: false,
  maxTodoLength: 30,
  themeColor: '#6366f1',
});

let originalThemeColor = '#6366f1';

const presetColors = [
  { name: '靛蓝', color: '#6366f1' },
  { name: '紫罗兰', color: '#8b5cf6' },
  { name: '玫红', color: '#ec4899' },
  { name: '红色', color: '#ef4444' },
  { name: '橙色', color: '#f97316' },
  { name: '黄色', color: '#eab308' },
  { name: '绿色', color: '#22c55e' },
  { name: '青色', color: '#06b6d4' },
  { name: '蓝色', color: '#3b82f6' },
];

const showOperationLog = ref(false);

const showAddModel = ref(false);
const editingModel = ref<ModelConfig | null>(null);
const modelForm = ref({
  name: '',
  apiUrl: '',
  apiKey: '',
  modelName: ''
});
const testResult = ref<{ success: boolean; error?: string } | null>(null);

const showDeleteConfirm = ref(false);
const modelToDelete = ref<ModelConfig | null>(null);

onMounted(async () => {
  await loadSettings();
});

onUnmounted(() => {
  applyThemeColor(originalThemeColor);
});

async function loadSettings() {
  try {
    const savedSettings = localStorage.getItem('app_settings');
    if (savedSettings) {
      settings.value = { ...settings.value, ...JSON.parse(savedSettings) };
    }
    originalThemeColor = settings.value.themeColor;
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
}

function applyThemeColor(color: string) {
  document.documentElement.style.setProperty('--accent-color', color);
  document.documentElement.style.setProperty('--accent-color-alpha', color + '1a');
}

function selectColor(color: string) {
  settings.value.themeColor = color;
  applyThemeColor(color);
}

async function handleSave() {
  try {
    const oldSettingsStr = localStorage.getItem('app_settings');
    const oldSettings = oldSettingsStr ? JSON.parse(oldSettingsStr) : {};
    const oldMaxTodoLength = oldSettings.maxTodoLength || 30;
    const oldAutoStart = oldSettings.autoStart || false;
    const oldThemeColor = oldSettings.themeColor || '#6366f1';
    
    localStorage.setItem('app_settings', JSON.stringify(settings.value));
    store.maxTodoLength = settings.value.maxTodoLength;
    originalThemeColor = settings.value.themeColor;
    
    const changes: string[] = [];
    if (settings.value.autoStart !== oldAutoStart) {
      changes.push(`开机自启动: ${settings.value.autoStart ? '开启' : '关闭'}`);
    }
    if (settings.value.maxTodoLength !== oldMaxTodoLength) {
      changes.push(`字数限制: ${oldMaxTodoLength}字 → ${settings.value.maxTodoLength}字`);
    }
    if (settings.value.themeColor !== oldThemeColor) {
      changes.push(`主题颜色: ${oldThemeColor} → ${settings.value.themeColor}`);
    }
    
    if (changes.length > 0) {
      await operation('系统设置', '设置', `修改设置: ${changes.join(', ')}`, '成功');
    } else {
      await operation('系统设置', '设置', '保存设置（无变更）', '成功');
    }
    
    console.log('Settings saved:', settings.value);
    showToast('保存成功', 'success');
    emit('close');
  } catch (e) {
    console.error('Failed to save settings:', e);
    await operation('系统设置', '设置', '保存设置失败', '失败');
    showToast('保存失败，请重试', 'error');
  }
}

async function viewOperationLog() {
  showOperationLog.value = true;
  await system('点击操作', '查看操作日志按钮', '用户点击查看操作日志按钮');
}

async function openOperationLogLocation() {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const { join } = await import('@tauri-apps/api/path');
    const appDir = await invoke<string>('get_app_data_dir');
    
    const operationLogPath = await join(appDir, 'operation.log');
    
    await invoke('open_file_location', { path: operationLogPath });
    await system('点击操作', '打开操作日志位置按钮', '用户点击打开操作日志文件位置');
  } catch (e) {
    console.error('Failed to open operation log location:', e);
    await system('错误', '打开操作日志位置失败', `错误信息: ${e}`);
    alert('无法打开操作日志文件位置: ' + e);
  }
}

async function openDebugLogLocation() {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('open_log_file_location');
    await system('点击操作', '打开调试日志位置按钮', '用户点击打开调试日志文件位置');
  } catch (e) {
    console.error('Failed to open debug log location:', e);
    await system('错误', '打开调试日志位置失败', `错误信息: ${e}`);
    alert('无法打开调试日志文件位置: ' + e);
  }
}

function openAddModel() {
  editingModel.value = null;
  modelForm.value = { name: '', apiUrl: '', apiKey: '', modelName: '' };
  testResult.value = null;
  showAddModel.value = true;
}

function openEditModel(model: ModelConfig) {
  editingModel.value = model;
  modelForm.value = {
    name: model.name,
    apiUrl: model.apiUrl,
    apiKey: '',
    modelName: model.modelName
  };
  testResult.value = null;
  showAddModel.value = true;
}

async function handleTestConnection() {
  if (!modelForm.value.apiUrl || !modelForm.value.modelName) {
    showToast('请填写API地址和模型标识符', 'error');
    return;
  }
  
  try {
    let apiKey = modelForm.value.apiKey;
    if (!apiKey && editingModel.value) {
      apiKey = await modelStore.getDecryptedApiKey(editingModel.value.id);
    }
    
    if (!apiKey) {
      showToast('请填写API密钥', 'error');
      return;
    }
    
    testResult.value = await modelStore.testConnectionDirect(
      modelForm.value.apiUrl,
      apiKey,
      modelForm.value.modelName
    );
    
    if (testResult.value.success) {
      showToast('连接测试成功', 'success');
    } else {
      showToast(testResult.value.error || '连接测试失败', 'error');
    }
  } catch (e) {
    showToast('测试连接时发生错误: ' + (e instanceof Error ? e.message : '未知错误'), 'error');
  }
}

async function handleSaveModel() {
  if (!modelForm.value.name || !modelForm.value.apiUrl || !modelForm.value.modelName) {
    showToast('请填写完整信息', 'error');
    return;
  }
  
  if (editingModel.value) {
    const updates: UpdateModelInput = {
      name: modelForm.value.name,
      apiUrl: modelForm.value.apiUrl,
      modelName: modelForm.value.modelName
    };
    if (modelForm.value.apiKey) {
      updates.apiKey = modelForm.value.apiKey;
    }
    await modelStore.updateModel(editingModel.value.id, updates);
    showToast('模型更新成功', 'success');
  } else {
    if (!modelForm.value.apiKey) {
      showToast('请填写API密钥', 'error');
      return;
    }
    await modelStore.addModel({
      name: modelForm.value.name,
      apiUrl: modelForm.value.apiUrl,
      apiKey: modelForm.value.apiKey,
      modelName: modelForm.value.modelName
    });
    showToast('模型添加成功', 'success');
  }
  
  showAddModel.value = false;
  await operation('系统设置', '模型配置', `${editingModel.value ? '更新' : '添加'}模型: ${modelForm.value.name}`, '成功');
}

function handleDeleteModel(model: ModelConfig) {
  modelToDelete.value = model;
  showDeleteConfirm.value = true;
}

async function confirmDeleteModel() {
  if (!modelToDelete.value) return;
  
  const model = modelToDelete.value;
  await modelStore.deleteModel(model.id);
  showToast('模型已删除', 'success');
  await operation('系统设置', '模型配置', `删除模型: ${model.name}`, '成功');
  
  showDeleteConfirm.value = false;
  modelToDelete.value = null;
}

function handleSelectModel(id: string) {
  modelStore.selectModel(id);
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
        
        <nav class="settings-tabs">
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'general' }"
            @click="activeTab = 'general'"
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
            <span>通用</span>
          </button>
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'model' }"
            @click="activeTab = 'model'"
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5A2.5 2.5 0 0 0 7.5 18a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5a2.5 2.5 0 0 0 2.5 2.5a2.5 2.5 0 0 0 2.5-2.5a2.5 2.5 0 0 0-2.5-2.5z"/>
            </svg>
            <span>模型</span>
          </button>
        </nav>
        
        <div class="settings-content">
          <div v-if="activeTab === 'general'" class="tab-content">
            <section class="section">
              <h3 class="section-title">通用设置</h3>
              
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">开机自启动</span>
                </div>
                <label class="toggle">
                  <input type="checkbox" v-model="settings.autoStart" />
                  <span class="toggle-slider"></span>
                </label>
              </div>
              
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">待办事项字数限制</span>
                </div>
                <input 
                  type="number" 
                  v-model.number="settings.maxTodoLength" 
                  min="10" 
                  max="200"
                  class="number-input"
                />
              </div>
              
              <div class="setting-item theme-color-setting">
                <div class="setting-info">
                  <span class="setting-label">主题颜色</span>
                </div>
                <div class="theme-colors">
                  <button
                    v-for="preset in presetColors"
                    :key="preset.color"
                    class="color-btn"
                    :class="{ active: settings.themeColor === preset.color }"
                    :style="{ backgroundColor: preset.color }"
                    :title="preset.name"
                    @click="selectColor(preset.color)"
                    type="button"
                  >
                    <svg v-if="settings.themeColor === preset.color" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </button>
                  <label class="color-btn custom-color" :style="{ backgroundColor: settings.themeColor }" title="自定义颜色">
                    <input
                      type="color"
                      v-model="settings.themeColor"
                      @input="applyThemeColor(settings.themeColor)"
                      class="color-picker"
                    />
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                    </svg>
                  </label>
                </div>
              </div>
            </section>
            
            <section class="section">
              <h3 class="section-title">日志管理</h3>
              
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">操作日志</span>
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
                  <span class="setting-desc">记录系统运行详情</span>
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
          
          <div v-else-if="activeTab === 'model'" class="tab-content">
            <section class="section">
              <div class="section-header">
                <h3 class="section-title">AI模型配置</h3>
                <button class="btn-add-model" @click="openAddModel" type="button">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  <span>添加模型</span>
                </button>
              </div>
              
              <div v-if="modelStore.models.length === 0" class="empty-models">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5A2.5 2.5 0 0 0 7.5 18a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5a2.5 2.5 0 0 0 2.5 2.5a2.5 2.5 0 0 0 2.5-2.5a2.5 2.5 0 0 0-2.5-2.5z"/>
                </svg>
                <p>暂无模型配置</p>
                <span>点击上方"添加模型"按钮配置AI模型</span>
              </div>
              
              <div v-else class="model-list">
                <div 
                  v-for="model in modelStore.models" 
                  :key="model.id" 
                  class="model-card"
                  :class="{ selected: modelStore.selectedModelId === model.id }"
                  @click="handleSelectModel(model.id)"
                >
                  <div class="model-info">
                    <div class="model-name">
                      <svg v-if="modelStore.selectedModelId === model.id" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      {{ model.name }}
                    </div>
                    <div class="model-details">
                      <span class="model-detail">{{ model.modelName }}</span>
                      <span class="model-divider">|</span>
                      <span class="model-detail">{{ model.apiUrl.replace(/^https?:\/\//, '').split('/')[0] }}</span>
                    </div>
                  </div>
                  <div class="model-actions">
                    <button class="btn-icon" @click.stop="openEditModel(model)" title="编辑" type="button">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button class="btn-icon btn-danger" @click.stop="handleDeleteModel(model)" title="删除" type="button">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
        
        <footer v-if="activeTab === 'general'" class="settings-footer">
          <button class="btn-save" @click="handleSave" type="button">保存设置</button>
        </footer>
      </div>
    </div>
    
    <div v-if="showAddModel" class="modal-overlay" @click="showAddModel = false">
      <div class="modal-content" @click.stop>
        <header class="modal-header">
          <h3>{{ editingModel ? '编辑模型' : '添加模型' }}</h3>
          <button class="close-btn" @click="showAddModel = false" type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>
        
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">配置名称</label>
            <input 
              type="text" 
              v-model="modelForm.name" 
              class="form-input" 
              placeholder="例如：DeepSeek助手"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">API地址</label>
            <input 
              type="text" 
              v-model="modelForm.apiUrl" 
              class="form-input" 
              placeholder="例如：https://api.deepseek.com"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">API密钥</label>
            <input 
              type="password" 
              v-model="modelForm.apiKey" 
              class="form-input" 
              :placeholder="editingModel ? '留空保持不变' : '输入API密钥'"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">模型标识符</label>
            <input 
              type="text" 
              v-model="modelForm.modelName" 
              class="form-input" 
              placeholder="例如：deepseek-chat"
            />
          </div>
          
          <div v-if="testResult" class="test-result" :class="{ success: testResult.success, error: !testResult.success }">
            {{ testResult.success ? '连接成功' : testResult.error }}
          </div>
        </div>
        
        <footer class="modal-footer">
          <button class="btn-secondary" @click="handleTestConnection" :disabled="modelStore.isTesting" type="button">
            {{ modelStore.isTesting ? '测试中...' : '测试连接' }}
          </button>
          <button class="btn-primary" @click="handleSaveModel" type="button">
            {{ editingModel ? '更新' : '添加' }}
          </button>
        </footer>
      </div>
    </div>
    
    <OperationLogViewer v-if="showOperationLog" @close="showOperationLog = false" />
    
    <ConfirmDialog
      v-if="showDeleteConfirm"
      title="删除模型"
      :message="`确定删除模型「${modelToDelete?.name}」吗？`"
      @confirm="confirmDeleteModel"
      @cancel="showDeleteConfirm = false"
    />
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

.settings-panel {
  background: var(--bg-primary);
  border-radius: 16px;
  width: 90%;
  max-width: 560px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.2s ease;
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

.settings-tabs {
  display: flex;
  gap: 4px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.tab-btn.active {
  background: var(--accent-color);
  color: white;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.tab-content {
  animation: fadeIn 0.15s ease;
}

.section {
  margin-bottom: 24px;
}

.section:last-child {
  margin-bottom: 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px;
}

.section-header .section-title {
  margin: 0;
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

.number-input {
  width: 80px;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
  text-align: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.number-input:hover {
  border-color: var(--accent-color);
}

.number-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px var(--accent-color-alpha);
}

.theme-color-setting {
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.theme-colors {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  width: 100%;
}

.color-btn {
  width: 36px;
  height: 36px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  position: relative;
}

.color-btn:hover {
  transform: scale(1.1);
  border-color: var(--text-primary);
}

.color-btn.active {
  border-color: var(--text-primary);
  box-shadow: 0 0 0 2px var(--bg-primary), 0 0 0 4px var(--text-primary);
}

.custom-color {
  position: relative;
  overflow: hidden;
}

.color-picker {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.btn-add-model {
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
}

.btn-add-model:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.empty-models {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  background: var(--bg-secondary);
  border-radius: 12px;
  color: var(--text-muted);
}

.empty-models svg {
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-models p {
  font-size: 15px;
  margin: 0 0 4px;
}

.empty-models span {
  font-size: 13px;
  opacity: 0.7;
}

.model-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.model-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: var(--bg-secondary);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.model-card:hover {
  background: var(--border-color);
}

.model-card.selected {
  border-color: var(--accent-color);
  background: var(--accent-color-alpha);
}

.model-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.model-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
}

.model-details {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted);
}

.model-divider {
  opacity: 0.5;
}

.model-actions {
  display: flex;
  gap: 4px;
}

.btn-icon {
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

.btn-icon:hover {
  background: var(--bg-primary);
  color: var(--text-primary);
}

.btn-icon.btn-danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger-color);
}

.help-text {
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 12px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.help-text p {
  margin: 0 0 12px;
}

.help-text ul {
  margin: 0;
  padding-left: 20px;
}

.help-text li {
  margin-bottom: 4px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  animation: fadeIn 0.15s ease;
}

.modal-content {
  background: var(--bg-primary);
  border-radius: 16px;
  width: 90%;
  max-width: 420px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.2s ease;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px var(--accent-color-alpha);
}

.form-input::placeholder {
  color: var(--text-muted);
}

.test-result {
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  margin-top: 12px;
}

.test-result.success {
  background: rgba(34, 197, 94, 0.1);
  color: var(--success-color);
}

.test-result.error {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger-color);
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
}

.btn-secondary {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: var(--bg-secondary);
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 10px;
  background: var(--accent-color);
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  opacity: 0.9;
}
</style>
