<script setup lang="ts">
import { onMounted } from 'vue';
import { useTodoStore } from './stores/todoStore';
import AddTodo from './components/AddTodo.vue';
import TodoItem from './components/TodoItem.vue';
import FilterBar from './components/FilterBar.vue';

const store = useTodoStore();

onMounted(() => {
  store.loadTodos();
});
</script>

<template>
  <div class="app">
    <header class="header">
      <h1 class="title">LiteDo</h1>
      <p class="subtitle">轻量级待办事项</p>
    </header>
    
    <main class="main">
      <AddTodo />
      <FilterBar />
      
      <div class="todo-list" v-if="store.filteredTodos.length">
        <TransitionGroup name="list">
          <TodoItem
            v-for="todo in store.filteredTodos"
            :key="todo.id"
            :todo="todo"
          />
        </TransitionGroup>
      </div>
      
      <div class="empty-state" v-else-if="!store.isLoading">
        <div class="empty-icon">📝</div>
        <p class="empty-text">
          {{ store.filter === 'all' ? '暂无待办事项' : 
             store.filter === 'active' ? '没有进行中的事项' : '没有已完成的事项' }}
        </p>
      </div>
      
      <div class="loading" v-if="store.isLoading">
        <div class="spinner"></div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  padding: 20px 16px;
  text-align: center;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.subtitle {
  font-size: 12px;
  color: var(--text-muted);
  margin: 4px 0 0;
}

.main {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-text {
  color: var(--text-muted);
  font-size: 14px;
}

.loading {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-color);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
