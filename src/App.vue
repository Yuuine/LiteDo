<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useTodoStore } from './stores/todoStore';
import Calendar from './components/Calendar.vue';
import TodoItem from './components/TodoItem.vue';
import SettingsPanel from './components/SettingsPanel.vue';
import AIDialog from './components/AIDialog.vue';
import Toast from './components/Toast.vue';
import Loading from './components/Loading.vue';
import Icon from './components/Icon.vue';
import TaskInput from './components/TaskInput.vue';
import FilterTabs from './components/FilterTabs.vue';
import logger, { system } from './utils/logger';
import { formatDate } from './utils/dateUtils';
import { showToast } from './utils/toast';
import type { PriorityType } from './types/todo';
import { getDefaultPriority } from './utils/priority';

const store = useTodoStore();

const showCalendar = ref(false);
const showSettings = ref(false);
const showAIDialog = ref(false);
const isSubmitting = ref(false);

const taskInputRef = ref<InstanceType<typeof TaskInput> | null>(null);
const selectedPriority = ref<PriorityType>(getDefaultPriority());

function closeAllModals(): void {
  showCalendar.value = false;
  showSettings.value = false;
  showAIDialog.value = false;
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    closeAllModals();
  }
}

async function handleAddTask(content: string, priority: PriorityType): Promise<void> {
  if (isSubmitting.value) return;
  
  isSubmitting.value = true;
  const createdTimestamp = Math.floor(store.selectedDate.getTime() / 1000);
  
  await logger.debug('App', 'Adding task', { content, createdTimestamp, selectedDate: store.selectedDate.toISOString() });
  
  try {
    await store.addTodoWithDate(content, createdTimestamp, priority);
    await logger.info('App', 'Task added successfully', { content, timestamp: createdTimestamp });
    showToast('任务添加成功');
    selectedPriority.value = getDefaultPriority();
  } catch (e) {
    await logger.error('App', 'Failed to add todo', { error: e, content });
    showToast('添加失败，请重试', 'error');
  } finally {
    isSubmitting.value = false;
  }
}

async function handleOpenCalendar(): Promise<void> {
  showCalendar.value = true;
  await system('点击操作', '日期选择按钮', '用户点击打开日历选择器');
}

async function handleOpenSettings(): Promise<void> {
  showSettings.value = true;
  await system('点击操作', '设置按钮', '用户点击打开设置面板');
}

async function handleOpenAI(): Promise<void> {
  showAIDialog.value = true;
  await system('点击操作', 'AI按钮', '用户点击打开AI解析对话框');
}

async function handleSelectDate(date: Date): Promise<void> {
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
          <Icon name="calendar" :size="18" />
          <span class="date-text">{{ formatDate(store.selectedDate) }}</span>
        </button>
      </div>
      <div class="header-right">
        <button class="ai-btn" @click="handleOpenAI" title="AI智能解析" type="button">
          <Icon name="ai" :size="18" />
          <span>AI</span>
        </button>
        <button class="settings-btn" @click="handleOpenSettings" title="设置" type="button">
          <Icon name="settings" :size="18" />
        </button>
      </div>
    </header>
    
    <main class="main">
      <div class="add-task-section">
        <TaskInput
          ref="taskInputRef"
          :disabled="isSubmitting"
          :show-priority="store.priorityEnabled"
          @submit="handleAddTask"
        />
      </div>
      
      <FilterTabs
        :model-value="store.filter"
        :stats="store.selectedDateStats"
        @update:model-value="store.setFilter"
      />
      
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
    <Loading />
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
  padding: 12px 20px;
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
  gap: 8px;
  padding: 8px 14px;
  border: none;
  border-radius: 10px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.date-btn:hover {
  background: var(--border-color);
}

.date-text {
  font-size: 15px;
  font-weight: 600;
}

.ai-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 10px;
  padding: 6px 14px;
  transition: all 0.2s;
}

.ai-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.settings-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
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
  padding: 16px 20px;
  overflow-y: scroll;
  display: flex;
  flex-direction: column;
  scrollbar-gutter: stable;
}

.add-task-section {
  margin-bottom: 12px;
  flex-shrink: 0;
}

.todo-list {
  display: flex;
  flex-direction: column;
  flex: 1;
  background: var(--bg-primary);
  border-radius: 10px;
  padding: 4px 0;
  border: 1px solid var(--border-color);
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
