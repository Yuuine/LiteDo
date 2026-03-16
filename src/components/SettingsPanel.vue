<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useTodoStore } from '../stores/todoStore';
import { useModelStore } from '../stores/modelStore';
import OperationLogViewer from './OperationLogViewer.vue';
import ConfirmDialog from './ConfirmDialog.vue';
import Icon from './Icon.vue';
import { operation, system } from '../utils/logger';
import { showToast } from '../utils/toast';
import type { ModelConfig, UpdateModelInput } from '../types/model';
import type { ImportStrategy, ImportResult } from '../types/export';
import { exportTodos } from '../utils/dataExport';
import { importTodos } from '../utils/dataImport';

const emit = defineEmits<{
  close: [];
}>();

const store = useTodoStore();
const modelStore = useModelStore();

const activeTab = ref<'general' | 'model'>('general');

const settings = ref({
  autoStart: false,
  themeColor: '#6366f1',
  priorityEnabled: false,
  sortByPriority: false,
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

const isExporting = ref(false);
const showImportDialog = ref(false);
const selectedStrategy = ref<ImportStrategy>('merge');
const importResult = ref<ImportResult | null>(null);

const isFormValid = computed(() => {
  return modelForm.value.name && modelForm.value.apiUrl && modelForm.value.modelName;
});

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
    const oldAutoStart = oldSettings.autoStart || false;
    const oldThemeColor = oldSettings.themeColor || '#6366f1';
    const oldPriorityEnabled = oldSettings.priorityEnabled || false;
    const oldSortByPriority = oldSettings.sortByPriority || false;
    
    localStorage.setItem('app_settings', JSON.stringify(settings.value));
    store.priorityEnabled = settings.value.priorityEnabled;
    store.sortByPriority = settings.value.sortByPriority;
    originalThemeColor = settings.value.themeColor;
    
    const changes: string[] = [];
    if (settings.value.autoStart !== oldAutoStart) {
      changes.push(`开机自启动: ${settings.value.autoStart ? '开启' : '关闭'}`);
    }
    if (settings.value.themeColor !== oldThemeColor) {
      changes.push(`主题颜色: ${oldThemeColor} → ${settings.value.themeColor}`);
    }
    if (settings.value.priorityEnabled !== oldPriorityEnabled) {
      changes.push(`优先级功能: ${settings.value.priorityEnabled ? '开启' : '关闭'}`);
    }
    if (settings.value.sortByPriority !== oldSortByPriority) {
      changes.push(`按优先级排序: ${settings.value.sortByPriority ? '开启' : '关闭'}`);
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
  } catch (e) {
    testResult.value = { success: false, error: '测试连接时发生错误: ' + (e instanceof Error ? e.message : '未知错误') };
  }
}

async function handleSaveModel() {
  if (!isFormValid.value) {
    showToast('请填写完整信息', 'error');
    return;
  }
  
  const isDuplicate = modelStore.models.some(m => 
    m.apiUrl === modelForm.value.apiUrl && 
    m.modelName === modelForm.value.modelName &&
    m.id !== editingModel.value?.id
  );
  
  if (isDuplicate) {
    showToast('重复的模型', 'error');
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

async function handleExport() {
  if (isExporting.value) return;
  
  const todos = store.todos;
  if (todos.length === 0) {
    showToast('没有待办事项可导出', 'error');
    return;
  }
  
  isExporting.value = true;
  try {
    const success = await exportTodos(todos);
    if (success) {
      showToast(`成功导出 ${todos.length} 条待办事项`, 'success');
    }
  } catch (error) {
    console.error('Export failed:', error);
    showToast('导出失败，请重试', 'error');
  } finally {
    isExporting.value = false;
  }
}

function openImportDialog() {
  selectedStrategy.value = 'merge';
  importResult.value = null;
  showImportDialog.value = true;
}

async function handleImport() {
  try {
    const result = await importTodos(selectedStrategy.value, store.todos);
    
    if (result === null) {
      return;
    }
    
    importResult.value = result;
    
    if (result.success && result.errors.length === 0) {
      await store.loadTodos();
      showToast(`成功导入 ${result.imported} 条待办事项`, 'success');
      showImportDialog.value = false;
    } else if (result.imported > 0) {
      await store.loadTodos();
    }
  } catch (error) {
    console.error('Import failed:', error);
    showToast('导入失败: ' + (error instanceof Error ? error.message : '未知错误'), 'error');
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
            <Icon name="close" :size="20" />
          </button>
        </header>
        
        <nav class="settings-tabs">
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'general' }"
            @click="activeTab = 'general'"
            type="button"
          >
            <Icon name="settings" :size="16" />
            <span>通用</span>
          </button>
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'model' }"
            @click="activeTab = 'model'"
            type="button"
          >
            <Icon name="ai" :size="16" />
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
                    <Icon v-if="settings.themeColor === preset.color" name="check" :size="16" color="white" :stroke-width="3" />
                  </button>
                  <label class="color-btn custom-color" :style="{ backgroundColor: settings.themeColor }" title="自定义颜色">
                    <input
                      type="color"
                      v-model="settings.themeColor"
                      @input="applyThemeColor(settings.themeColor)"
                      class="color-picker"
                    />
                    <Icon name="settings" :size="16" color="white" />
                  </label>
                </div>
              </div>
            </section>
            
            <section class="section">
              <h3 class="section-title">优先级功能</h3>
              
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">启用优先级功能</span>
                  <span class="setting-desc">开启后可设置任务优先级，AI解析也会识别优先级</span>
                </div>
                <label class="toggle">
                  <input type="checkbox" v-model="settings.priorityEnabled" />
                  <span class="toggle-slider"></span>
                </label>
              </div>
              
              <div v-if="settings.priorityEnabled" class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">按优先级排序</span>
                  <span class="setting-desc">任务列表按优先级从高到低排序</span>
                </div>
                <label class="toggle">
                  <input type="checkbox" v-model="settings.sortByPriority" />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </section>
            
            <section class="section">
              <h3 class="section-title">数据管理</h3>
              
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">导出数据</span>
                  <span class="setting-desc">将所有待办事项导出为 JSON 文件</span>
                </div>
                <button 
                  class="btn-export" 
                  @click="handleExport" 
                  type="button"
                  :disabled="isExporting"
                >
                  <Icon name="download" :size="16" />
                  <span>{{ isExporting ? '导出中...' : '导出' }}</span>
                </button>
              </div>
              
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">导入数据</span>
                  <span class="setting-desc">从 JSON 文件导入待办事项</span>
                </div>
                <button 
                  class="btn-import" 
                  @click="openImportDialog" 
                  type="button"
                >
                  <Icon name="upload" :size="16" />
                  <span>导入</span>
                </button>
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
                    <Icon name="eye" :size="16" />
                    <span>查看</span>
                  </button>
                  <button class="btn-open-log" @click="openOperationLogLocation" type="button" title="在资源管理器中打开">
                    <Icon name="folder" :size="16" />
                    <span>打开位置</span>
                  </button>
                </div>
              </div>
              
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label">调试日志</span>
                </div>
                <button class="btn-open-log" @click="openDebugLogLocation" type="button" title="在资源管理器中打开">
                  <Icon name="folder" :size="16" />
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
                  <Icon name="plus" :size="16" />
                  <span>添加模型</span>
                </button>
              </div>
              
              <div v-if="modelStore.models.length === 0" class="empty-models">
                <Icon name="ai" :size="48" color="var(--text-muted)" />
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
                      <Icon v-if="modelStore.selectedModelId === model.id" name="check" :size="16" color="var(--accent-color)" />
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
                      <Icon name="edit" :size="16" />
                    </button>
                    <button class="btn-icon btn-danger" @click.stop="handleDeleteModel(model)" title="删除" type="button">
                      <Icon name="delete" :size="16" />
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
            <Icon name="close" :size="20" />
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
    
    <div v-if="showImportDialog" class="modal-overlay" @click="showImportDialog = false">
      <div class="modal-content import-modal" @click.stop>
        <header class="modal-header">
          <h3>导入待办事项</h3>
          <button class="close-btn" @click="showImportDialog = false" type="button">
            <Icon name="close" :size="20" />
          </button>
        </header>
        
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">导入策略</label>
            <div class="strategy-options">
              <label class="strategy-option" :class="{ active: selectedStrategy === 'merge' }">
                <input type="radio" v-model="selectedStrategy" value="merge" />
                <div class="strategy-content">
                  <span class="strategy-title">合并</span>
                  <span class="strategy-desc">保留现有数据，添加导入的数据</span>
                </div>
              </label>
              <label class="strategy-option" :class="{ active: selectedStrategy === 'skip_duplicates' }">
                <input type="radio" v-model="selectedStrategy" value="skip_duplicates" />
                <div class="strategy-content">
                  <span class="strategy-title">跳过重复</span>
                  <span class="strategy-desc">按 ID 跳过已存在的待办事项</span>
                </div>
              </label>
              <label class="strategy-option" :class="{ active: selectedStrategy === 'replace' }">
                <input type="radio" v-model="selectedStrategy" value="replace" />
                <div class="strategy-content">
                  <span class="strategy-title">替换</span>
                  <span class="strategy-desc">清空现有数据后导入（谨慎使用）</span>
                </div>
              </label>
            </div>
          </div>
          
          <div v-if="importResult" class="import-result" :class="{ success: importResult.success, 'has-errors': importResult.errors.length > 0 }">
            <div class="result-summary">
              <span>总计: {{ importResult.total }}</span>
              <span>成功: {{ importResult.imported }}</span>
              <span>跳过: {{ importResult.skipped }}</span>
              <span v-if="importResult.errors.length > 0">错误: {{ importResult.errors.length }}</span>
            </div>
            <div v-if="importResult.errors.length > 0" class="result-errors">
              <div v-for="(error, index) in importResult.errors.slice(0, 5)" :key="index" class="error-item">
                {{ error }}
              </div>
              <div v-if="importResult.errors.length > 5" class="error-more">
                还有 {{ importResult.errors.length - 5 }} 条错误...
              </div>
            </div>
          </div>
        </div>
        
        <footer class="modal-footer">
          <button class="btn-secondary" @click="showImportDialog = false" type="button">取消</button>
          <button class="btn-primary" @click="handleImport" type="button">选择文件并导入</button>
        </footer>
      </div>
    </div>
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

.btn-export,
.btn-import {
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

.btn-export:hover,
.btn-import:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn-export:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.import-modal {
  max-width: 480px;
}

.strategy-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.strategy-option {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  background: var(--bg-secondary);
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.strategy-option:hover {
  background: var(--border-color);
}

.strategy-option.active {
  border-color: var(--accent-color);
  background: var(--accent-color-alpha);
}

.strategy-option input {
  margin-top: 2px;
  accent-color: var(--accent-color);
}

.strategy-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.strategy-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.strategy-desc {
  font-size: 12px;
  color: var(--text-muted);
}

.import-result {
  padding: 12px 14px;
  border-radius: 8px;
  font-size: 13px;
  margin-top: 12px;
  background: var(--bg-secondary);
}

.import-result.success {
  background: rgba(34, 197, 94, 0.1);
}

.import-result.has-errors {
  background: rgba(239, 68, 68, 0.1);
}

.result-summary {
  display: flex;
  gap: 16px;
  color: var(--text-primary);
  font-weight: 500;
}

.result-errors {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border-color);
}

.error-item {
  font-size: 12px;
  color: var(--danger-color);
  margin-bottom: 4px;
  word-break: break-all;
}

.error-more {
  font-size: 12px;
  color: var(--text-muted);
  font-style: italic;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { 
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to { 
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
