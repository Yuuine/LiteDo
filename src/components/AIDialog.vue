<script setup lang="ts">
import { ref, computed } from 'vue';
import { useModelStore } from '../stores/modelStore';
import { useTodoStore } from '../stores/todoStore';
import type { ParsedTodo } from '../types/model';
import { operation } from '../utils/logger';

function showToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
  window.dispatchEvent(new CustomEvent('toast', { detail: { message, type } }));
}

const emit = defineEmits<{
  close: [];
}>();

const modelStore = useModelStore();
const todoStore = useTodoStore();

const inputText = ref('');
const selectedModelId = ref(modelStore.selectedModelId || '');
const isParsing = ref(false);
const parseResult = ref<ParsedTodo[]>([]);
const selectedTodos = ref<Set<number>>(new Set());
const showResult = ref(false);

const canParse = computed(() => {
  return inputText.value.trim() && selectedModelId.value && !isParsing.value;
});

function toggleTodo(index: number) {
  if (selectedTodos.value.has(index)) {
    selectedTodos.value.delete(index);
  } else {
    selectedTodos.value.add(index);
  }
}

function selectAll() {
  parseResult.value.forEach((_, index) => {
    selectedTodos.value.add(index);
  });
}

function deselectAll() {
  selectedTodos.value.clear();
}

async function handleParse() {
  if (!canParse.value) return;
  
  if (!selectedModelId.value) {
    showToast('请先选择模型', 'error');
    return;
  }
  
  isParsing.value = true;
  showResult.value = false;
  
  try {
    const result = await modelStore.parseTodosWithAI(selectedModelId.value, inputText.value);
    
    if (result.success && result.todos.length > 0) {
      parseResult.value = result.todos;
      selectedTodos.value = new Set(result.todos.map((_, i) => i));
      showResult.value = true;
      await operation('AI解析', '待办事项', `解析成功: ${result.todos.length}项`, '成功');
    } else {
      showToast(result.error || '解析失败，请重试', 'error');
      await operation('AI解析', '待办事项', `解析失败: ${result.error}`, '失败');
    }
  } catch (e) {
    showToast('解析过程出错', 'error');
    await operation('AI解析', '待办事项', `解析出错: ${e}`, '失败');
  } finally {
    isParsing.value = false;
  }
}

async function handleSubmit() {
  const todosToAdd = parseResult.value.filter((_, index) => selectedTodos.value.has(index));
  
  if (todosToAdd.length === 0) {
    showToast('请至少选择一项待办', 'error');
    return;
  }
  
  let successCount = 0;
  const createdTimestamp = Math.floor(todoStore.selectedDate.getTime() / 1000);
  
  for (const todo of todosToAdd) {
    try {
      await todoStore.addTodoWithDate(todo.content, createdTimestamp);
      successCount++;
    } catch (e) {
      console.error('Failed to add todo:', e);
    }
  }
  
  if (successCount > 0) {
    showToast(`成功添加 ${successCount} 项待办`, 'success');
    await operation('AI解析', '待办事项', `添加 ${successCount} 项待办`, '成功');
  }
  
  emit('close');
}

function handleBack() {
  showResult.value = false;
  parseResult.value = [];
  selectedTodos.value.clear();
}
</script>

<template>
  <Teleport to="body">
    <div class="ai-dialog-overlay" @click="emit('close')">
      <div class="ai-dialog" @click.stop>
        <header class="dialog-header">
          <div class="header-left">
            <button v-if="showResult" class="back-btn" @click="handleBack" type="button">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <h2>{{ showResult ? '确认待办事项' : 'AI智能解析' }}</h2>
          </div>
          <button class="close-btn" @click="emit('close')" type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>
        
        <div class="dialog-content">
          <div v-if="!showResult" class="input-section">
            <div class="form-group">
              <label class="form-label">选择模型</label>
              <select v-model="selectedModelId" class="model-select" :disabled="modelStore.models.length === 0">
                <option v-if="modelStore.models.length === 0" value="">请先在设置中添加模型</option>
                <option v-for="model in modelStore.models" :key="model.id" :value="model.id">
                  {{ model.name }} ({{ model.modelName }})
                </option>
              </select>
            </div>
            
            <div class="form-group">
              <label class="form-label">任务描述</label>
              <textarea 
                v-model="inputText" 
                class="task-textarea" 
                placeholder="描述你想要完成的任务"
                rows="6"
              ></textarea>
              <span class="char-count">{{ inputText.length }} 字</span>
            </div>
            
            <div v-if="!modelStore.hasModels" class="no-model-hint">
              <span>请先在设置 → 模型中添加AI模型配置</span>
            </div>
          </div>
          
          <div v-else class="result-section">
            <div class="result-header">
              <span class="result-count">已解析 {{ parseResult.length }} 项待办</span>
              <div class="result-actions">
                <button class="btn-text" @click="selectAll" type="button">全选</button>
                <button class="btn-text" @click="deselectAll" type="button">取消全选</button>
              </div>
            </div>
            
            <div class="todo-list">
              <div 
                v-for="(todo, index) in parseResult" 
                :key="index"
                class="todo-item"
                :class="{ selected: selectedTodos.has(index) }"
                @click="toggleTodo(index)"
              >
                <div class="todo-checkbox">
                  <svg v-if="selectedTodos.has(index)" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  </svg>
                </div>
                <div class="todo-content">
                  <span class="todo-text">{{ todo.content }}</span>
                  <span class="todo-priority" :class="todo.priority">
                    {{ todo.priority === 'high' ? '高优先' : todo.priority === 'medium' ? '中优先' : '低优先' }}
                  </span>
                </div>
              </div>
            </div>
            
            <div class="selected-count">
              已选择 {{ selectedTodos.size }} 项
            </div>
          </div>
        </div>
        
        <footer class="dialog-footer">
          <template v-if="!showResult">
            <button 
              class="btn-parse" 
              :disabled="!canParse" 
              @click="handleParse"
              type="button"
            >
              <svg v-if="isParsing" class="loading-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
              </svg>
              <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2"/>
              </svg>
              <span>{{ isParsing ? '解析中...' : '开始解析' }}</span>
            </button>
          </template>
          <template v-else>
            <button class="btn-secondary" @click="handleBack" type="button">重新解析</button>
            <button class="btn-primary" @click="handleSubmit" type="button">
              提交 ({{ selectedTodos.size }})
            </button>
          </template>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.ai-dialog-overlay {
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

.ai-dialog {
  background: var(--bg-primary);
  border-radius: 16px;
  width: 90%;
  max-width: 480px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.2s ease;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dialog-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.back-btn {
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

.back-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
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

.dialog-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.input-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  position: relative;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.model-select {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  cursor: pointer;
  transition: all 0.2s;
  box-sizing: border-box;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238a8aa3' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
}

.model-select:focus {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.model-select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.task-textarea {
  width: 100%;
  padding: 14px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.6;
  outline: none;
  resize: none;
  transition: all 0.2s;
  box-sizing: border-box;
  font-family: inherit;
}

.task-textarea:focus {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.task-textarea::placeholder {
  color: var(--text-muted);
}

.char-count {
  position: absolute;
  right: 12px;
  bottom: 12px;
  font-size: 12px;
  color: var(--text-muted);
}

.no-model-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  background: rgba(245, 158, 11, 0.1);
  border-radius: 10px;
  font-size: 13px;
  color: var(--warning-color);
}

.result-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.result-count {
  font-size: 14px;
  color: var(--text-secondary);
}

.result-actions {
  display: flex;
  gap: 12px;
}

.btn-text {
  background: none;
  border: none;
  color: var(--accent-color);
  font-size: 13px;
  cursor: pointer;
  padding: 0;
}

.btn-text:hover {
  text-decoration: underline;
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.todo-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  background: var(--bg-secondary);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.todo-item:hover {
  background: var(--border-color);
}

.todo-item.selected {
  border-color: var(--accent-color);
  background: rgba(99, 102, 241, 0.1);
}

.todo-checkbox {
  flex-shrink: 0;
  color: var(--border-color);
  margin-top: 2px;
}

.todo-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.todo-text {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.4;
}

.todo-priority {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  width: fit-content;
}

.todo-priority.high {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger-color);
}

.todo-priority.medium {
  background: rgba(245, 158, 11, 0.1);
  color: var(--warning-color);
}

.todo-priority.low {
  background: rgba(34, 197, 94, 0.1);
  color: var(--success-color);
}

.selected-count {
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
}

.dialog-footer {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}

.btn-parse {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
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

.btn-parse:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn-parse:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.btn-secondary {
  flex: 1;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
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

.btn-primary {
  flex: 1;
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

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
</style>
