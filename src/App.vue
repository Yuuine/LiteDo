<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useTodoStore } from './stores/todoStore';
import Calendar from './components/Calendar.vue';
import TodoItem from './components/TodoItem.vue';
import SettingsPanel from './components/SettingsPanel.vue';
import AIDialog from './components/AIDialog.vue';
import Toast from './components/Toast.vue';
import logger, { system } from './utils/logger';
import { formatDate } from './utils/dateUtils';

const store = useTodoStore();
const showCalendar = ref(false);
const showSettings = ref(false);
const showAIDialog = ref(false);
const newTaskContent = ref('');
const isSubmitting = ref(false);

function showToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
  window.dispatchEvent(new CustomEvent('toast', { detail: { message, type } }));
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    showCalendar.value = false;
    showSettings.value = false;
    showAIDialog.value = false;
  }
}

async function handleAddTask() {
  const text = newTaskContent.value.trim();
  await logger.debug('App', 'handleAddTask called', { text, isSubmitting: isSubmitting.value, textLength: text.length });
  
  if (!text || isSubmitting.value) {
    await logger.debug('App', 'handleAddTask early return', { hasText: !!text, isSubmitting: isSubmitting.value });
    return;
  }
  
  if (text.length > store.maxTodoLength) {
    await logger.warn('App', 'Task content exceeds max length', { textLength: text.length, maxAllowed: store.maxTodoLength });
    showToast(`待办事项字数超过限制（最多${store.maxTodoLength}字）`, 'error');
    return;
  }
  
  isSubmitting.value = true;
  const createdTimestamp = Math.floor(store.selectedDate.getTime() / 1000);
  await logger.debug('App', 'Adding task', { text, createdTimestamp, selectedDate: store.selectedDate.toISOString() });
  
  try {
    await store.addTodoWithDate(text, createdTimestamp);
    await logger.info('App', 'Task added successfully', { text, timestamp: createdTimestamp });
    showToast('任务添加成功');
    newTaskContent.value = '';
  } catch (e) {
    await logger.error('App', 'Failed to add todo', { error: e, text });
    showToast('添加失败，请重试', 'error');
  } finally {
    isSubmitting.value = false;
  }
}

async function handleOpenCalendar() {
  showCalendar.value = true;
  await system('点击操作', '日期选择按钮', '用户点击打开日历选择器');
}

async function handleOpenSettings() {
  showSettings.value = true;
  await system('点击操作', '设置按钮', '用户点击打开设置面板');
}

async function handleOpenAI() {
  showAIDialog.value = true;
  await system('点击操作', 'AI按钮', '用户点击打开AI解析对话框');
}

async function handleSelectDate(date: Date) {
  await logger.debug('App', 'Date selected', { date: date.toISOString() });
  store.setSelectedDate(date);
  showCalendar.value = false;
  await system('点击操作', '日历日期选择', `用户选择了日期: ${formatDate(date)}`);
}

onMounted(async () => {
  await logger.info('App', 'Application mounted', { timestamp: new Date().toISOString() });
  await store.loadTodos();
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div class="app">
    <header class="header">
      <div class="header-left">
        <button class="date-btn" @click="handleOpenCalendar" type="button">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span class="date-text">{{ formatDate(store.selectedDate) }}</span>
          <span class="task-count">{{ store.selectedDateStats.active }} 项待办</span>
        </button>
      </div>
      <div class="header-right">
        <button class="ai-btn" @click="handleOpenAI" title="AI智能解析" type="button">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5A2.5 2.5 0 0 0 7.5 18a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5a2.5 2.5 0 0 0 2.5 2.5a2.5 2.5 0 0 0 2.5-2.5a2.5 2.5 0 0 0-2.5-2.5z"/>
          </svg>
          <span>AI</span>
        </button>
        <button class="settings-btn" @click="handleOpenSettings" title="设置" type="button">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
        </button>
      </div>
    </header>
    
    <main class="main">
      <div class="add-task-section">
        <form class="add-task-form" @submit.prevent="handleAddTask">
          <div class="input-wrapper">
            <input
              v-model="newTaskContent"
              type="text"
              :placeholder="`添加新任务（最多${store.maxTodoLength}字）`"
              class="task-input"
              :maxlength="store.maxTodoLength"
            />
            <span class="char-count" v-if="newTaskContent.length > 0">
              {{ newTaskContent.length }}/{{ store.maxTodoLength }}
            </span>
          </div>
          <button 
            type="submit" 
            class="btn-add" 
            :disabled="!newTaskContent.trim() || isSubmitting"
            title="添加任务"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </form>
      </div>
      
      <nav class="filter-tabs">
        <button 
          class="tab" 
          :class="{ active: store.filter === 'all' }" 
          @click="store.setFilter('all')"
          type="button"
        >
          全部 {{ store.selectedDateStats.total }}
        </button>
        <button 
          class="tab" 
          :class="{ active: store.filter === 'active' }" 
          @click="store.setFilter('active')"
          type="button"
        >
          待办 {{ store.selectedDateStats.active }}
        </button>
        <button 
          class="tab" 
          :class="{ active: store.filter === 'completed' }" 
          @click="store.setFilter('completed')"
          type="button"
        >
          完成 {{ store.selectedDateStats.completed }}
        </button>
      </nav>
      
      <section class="todo-list" v-if="store.filteredTodos.length">
        <TransitionGroup name="list">
          <TodoItem
            v-for="todo in store.filteredTodos"
            :key="todo.id"
            :todo="todo"
          />
        </TransitionGroup>
      </section>
      
      <section class="empty-state" v-else-if="!store.isLoading">
        <p class="empty-text">暂无任务</p>
        <p class="empty-hint">在上方输入框添加新任务</p>
      </section>
    </main>
    
    <Teleport to="body">
      <div v-if="showCalendar" class="calendar-overlay" @click="showCalendar = false">
        <div class="calendar-modal" @click.stop>
          <Calendar 
            :selected-date="store.selectedDate" 
            @select-date="handleSelectDate" 
          />
        </div>
      </div>
    </Teleport>
    
    <SettingsPanel v-if="showSettings" @close="showSettings = false" />
    <AIDialog v-if="showAIDialog" @close="showAIDialog = false" />
    <Toast />
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background: var(--bg-secondary);
  overflow: hidden;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-right {
  display: flex;
  gap: 8px;
}

.date-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border: none;
  border-radius: 12px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.date-btn:hover {
  background: var(--border-color);
}

.date-text {
  font-size: 16px;
  font-weight: 600;
}

.task-count {
  font-size: 13px;
  color: var(--text-muted);
}

.ai-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  background: linear-gradient(135deg, #6366f1);
  color: white;
  border: none;
  border-radius: 10px;
  padding: 6px 16px;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
}

.ai-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
}

.settings-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 12px;
  background: var(--bg-secondary);
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.settings-btn:hover {
  background: var(--border-color);
  color: var(--text-primary);
}

.main {
  flex: 1;
  padding: 20px 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.add-task-section {
  margin-bottom: 20px;
  flex-shrink: 0;
}

.add-task-form {
  display: flex;
  gap: 12px;
  align-items: center;
}

.input-wrapper {
  flex: 1;
  position: relative;
}

.task-input {
  width: 100%;
  padding: 14px 16px;
  padding-right: 60px;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 15px;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
}

.task-input:focus {
  border-color: var(--accent-color);
}

.task-input::placeholder {
  color: var(--text-muted);
}

.char-count {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: var(--text-muted);
  pointer-events: none;
}

.btn-add {
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 12px;
  background: var(--accent-color);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-add:hover:not(:disabled) {
  transform: scale(1.05);
  opacity: 0.9;
}

.btn-add:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.filter-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  background: var(--bg-primary);
  padding: 4px;
  border-radius: 10px;
  flex-shrink: 0;
}

.tab {
  flex: 1;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-muted);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab:hover {
  color: var(--text-primary);
}

.tab.active {
  background: var(--accent-color);
  color: white;
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 20px;
}

.empty-text {
  color: var(--text-muted);
  font-size: 15px;
  margin: 0 0 8px;
}

.empty-hint {
  color: var(--text-muted);
  font-size: 13px;
  opacity: 0.6;
  margin: 0;
}

.calendar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.15s ease;
}

.calendar-modal {
  background: var(--bg-primary);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.2s ease;
  width: 320px;
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

@media (max-width: 768px) {
  .header {
    padding: 12px 16px;
  }
  
  .main {
    padding: 16px;
  }
  
  .date-btn {
    padding: 8px 12px;
  }
  
  .date-text {
    font-size: 14px;
  }
}
</style>
