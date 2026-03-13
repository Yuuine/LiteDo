<script setup lang="ts">
import { ref, computed } from 'vue';
import { isSameDay } from '../utils/dateUtils';

declare global {
  interface WindowEventMap {
    toast: CustomEvent<{ message: string; type: 'success' | 'error' | 'info' }>;
  }
}

function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  window.dispatchEvent(new CustomEvent('toast', { detail: { message, type } }));
}

const props = defineProps<{
  selectedDate: Date;
}>();

const emit = defineEmits<{
  selectDate: [date: Date];
}>();

const currentDate = computed(() => new Date());
const viewYear = ref(currentDate.value.getFullYear());
const viewMonth = ref(currentDate.value.getMonth());

const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

const calendarDays = computed(() => {
  const firstDay = new Date(viewYear.value, viewMonth.value, 1);
  const lastDay = new Date(viewYear.value, viewMonth.value + 1, 0);
  const days: { date: Date; isCurrentMonth: boolean; isToday: boolean; isSelected: boolean; isFuture: boolean }[] = [];
  const today = currentDate.value;
  
  const startPadding = firstDay.getDay();
  for (let i = startPadding - 1; i >= 0; i--) {
    const date = new Date(viewYear.value, viewMonth.value, -i);
    days.push({
      date,
      isCurrentMonth: false,
      isToday: false,
      isSelected: isSameDay(date, props.selectedDate),
      isFuture: false
    });
  }
  
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const date = new Date(viewYear.value, viewMonth.value, i);
    days.push({
      date,
      isCurrentMonth: true,
      isToday: isSameDay(date, today),
      isSelected: isSameDay(date, props.selectedDate),
      isFuture: date > today
    });
  }
  
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    const date = new Date(viewYear.value, viewMonth.value + 1, i);
    days.push({
      date,
      isCurrentMonth: false,
      isToday: false,
      isSelected: isSameDay(date, props.selectedDate),
      isFuture: false
    });
  }
  
  return days;
});

const monthLabel = computed(() => {
  return `${viewYear.value}年${viewMonth.value + 1}月`;
});

function changeMonth(delta: number) {
  const newDate = new Date(viewYear.value, viewMonth.value + delta, 1);
  viewYear.value = newDate.getFullYear();
  viewMonth.value = newDate.getMonth();
}

function selectDate(date: Date) {
  if (date > currentDate.value) {
    showToast('不能选择未来日期', 'info');
    return;
  }
  emit('selectDate', new Date(date));
}

function goToToday() {
  viewYear.value = currentDate.value.getFullYear();
  viewMonth.value = currentDate.value.getMonth();
  emit('selectDate', new Date(currentDate.value));
}
</script>

<template>
  <div class="calendar">
    <header class="calendar-header">
      <button class="nav-btn" @click="changeMonth(-1)" type="button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <span class="month-label">{{ monthLabel }}</span>
      <button class="nav-btn" @click="changeMonth(1)" type="button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    </header>
    
    <div class="weekdays">
      <span v-for="day in weekDays" :key="day" class="weekday">{{ day }}</span>
    </div>
    
    <div class="days">
      <button
        v-for="(day, index) in calendarDays"
        :key="index"
        class="day"
        :class="{
          'other-month': !day.isCurrentMonth,
          'today': day.isToday,
          'selected': day.isSelected,
          'future': day.isFuture
        }"
        @click="selectDate(day.date)"
        :disabled="day.isFuture"
        type="button"
      >
        {{ day.date.getDate() }}
      </button>
    </div>
    
    <button class="today-btn" @click="goToToday" type="button">回到今天</button>
  </div>
</template>

<style scoped>
.calendar {
  width: 100%;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.nav-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.nav-btn:hover {
  background: var(--accent-color);
  color: white;
}

.month-label {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 8px;
}

.weekday {
  text-align: center;
  font-size: 12px;
  color: var(--text-muted);
  padding: 8px 0;
}

.days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.day {
  aspect-ratio: 1;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
  width: 100%;
}

.day:hover:not(.future):not(.today) {
  background: var(--bg-secondary);
  font-weight: 600;
}

.day.other-month {
  color: var(--text-muted);
  opacity: 0.5;
}

.day.today {
  background: var(--accent-color);
  color: white;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
}

.day.today:hover {
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.5);
}

.day.selected:not(.today) {
  background: var(--bg-secondary);
  font-weight: 600;
  border: 2px solid var(--accent-color);
}

.day.future {
  color: var(--text-muted);
  opacity: 0.3;
  cursor: not-allowed;
}

.today-btn {
  width: 100%;
  margin-top: 12px;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.today-btn:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
}
</style>
