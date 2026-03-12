<script setup lang="ts">
import { ref } from 'vue';
import { useTodoStore } from '../stores/todoStore';

const store = useTodoStore();
const newTodo = ref('');
const priority = ref<'low' | 'medium' | 'high'>('medium');

async function handleSubmit() {
  const content = newTodo.value.trim();
  if (!content) return;
  
  await store.addTodo(content, priority.value);
  newTodo.value = '';
  priority.value = 'medium';
}
</script>

<template>
  <form class="add-todo" @submit.prevent="handleSubmit">
    <div class="input-wrapper">
      <input
        v-model="newTodo"
        type="text"
        placeholder="添加待办事项..."
        class="todo-input"
      />
      <select v-model="priority" class="priority-select">
        <option value="low">低</option>
        <option value="medium">中</option>
        <option value="high">高</option>
      </select>
    </div>
    <button type="submit" class="add-btn" :disabled="!newTodo.trim()">
      <span class="plus-icon">+</span>
    </button>
  </form>
</template>

<style scoped>
.add-todo {
  display: flex;
  gap: 8px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 12px;
  margin-bottom: 16px;
}

.input-wrapper {
  flex: 1;
  display: flex;
  gap: 8px;
}

.todo-input {
  flex: 1;
  padding: 10px 14px;
  border: none;
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
}

.todo-input::placeholder {
  color: var(--text-muted);
}

.priority-select {
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  outline: none;
}

.add-btn {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 8px;
  background: var(--accent-color);
  color: white;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-btn:hover:not(:disabled) {
  transform: scale(1.05);
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.plus-icon {
  line-height: 1;
}
</style>
