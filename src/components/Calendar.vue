<script setup lang="ts">
import { ref, computed } from 'vue';
import Icon from './Icon.vue';
import { isSameDay } from '../utils/dateUtils';
import { showToast } from '../utils/toast';

const props = defineProps<{
  selectedDate: Date;
}>();

const emit = defineEmits<{
  selectDate: [date: Date];
}>();

const today = new Date();
today.setHours(0, 0, 0, 0);

const viewYear = ref(today.getFullYear());
const viewMonth = ref(today.getMonth());

const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

interface CalendarDay {
  date: Date;
  dateNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isFuture: boolean;
}

const calendarDays = computed((): CalendarDay[] => {
  const year = viewYear.value;
  const month = viewMonth.value;
  const days: CalendarDay[] = [];
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  
  const prevMonth = new Date(year, month, 0);
  const daysInPrevMonth = prevMonth.getDate();
  
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dateNum = daysInPrevMonth - i;
    const date = new Date(year, month - 1, dateNum);
    days.push({
      date,
      dateNum,
      isCurrentMonth: false,
      isToday: false,
      isSelected: isSameDay(date, props.selectedDate),
      isFuture: date > today
    });
  }
  
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i);
    days.push({
      date,
      dateNum: i,
      isCurrentMonth: true,
      isToday: isSameDay(date, today),
      isSelected: isSameDay(date, props.selectedDate),
      isFuture: date > today
    });
  }
  
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    const date = new Date(year, month + 1, i);
    days.push({
      date,
      dateNum: i,
      isCurrentMonth: false,
      isToday: false,
      isSelected: isSameDay(date, props.selectedDate),
      isFuture: date > today
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

function selectDate(day: CalendarDay) {
  if (day.isFuture) {
    showToast('不能选择未来日期', 'info');
    return;
  }
  emit('selectDate', new Date(day.date));
}

function goToToday() {
  viewYear.value = today.getFullYear();
  viewMonth.value = today.getMonth();
  emit('selectDate', new Date(today));
}
</script>

<template>
  <div class="calendar">
    <header class="calendar-header">
      <button class="nav-btn" @click="changeMonth(-1)" type="button">
        <Icon name="chevron-left" :size="16" />
      </button>
      <span class="month-label">{{ monthLabel }}</span>
      <button class="nav-btn" @click="changeMonth(1)" type="button">
        <Icon name="chevron-right" :size="16" />
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
        @click="selectDate(day)"
        :disabled="day.isFuture"
        type="button"
      >
        {{ day.dateNum }}
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
