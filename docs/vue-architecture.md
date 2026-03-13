# Vue 项目架构说明

本文档详细说明 LiteDo 项目的前端架构设计、核心模块、技术选型、目录结构以及最佳实践。

## 目录

- [技术选型](#技术选型)
- [目录结构](#目录结构)
- [核心模块](#核心模块)
- [状态管理](#状态管理)
- [组件设计](#组件设计)
- [最佳实践](#最佳实践)

## 技术选型

### 核心框架

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue 3 | ^3.5.13 | 渐进式 JavaScript 框架，采用 Composition API |
| TypeScript | ~5.6.2 | 类型安全的 JavaScript 超集 |
| Pinia | ^3.0.4 | Vue 官方推荐的状态管理库 |
| Vite | ^6.0.3 | 下一代前端构建工具 |

### 桌面应用框架

| 技术 | 版本 | 用途 |
|------|------|------|
| Tauri 2.0 | ^2 | 构建更小、更快、更安全的桌面应用 |
| Rust | - | Tauri 后端系统编程语言 |
| SQLite | - | 轻量级嵌入式数据库 |

### 技术选型理由

#### Vue 3 + Composition API

- **更好的 TypeScript 支持**：Composition API 天然支持类型推断
- **更灵活的代码组织**：可以按功能而非选项组织代码
- **更好的代码复用**：通过 Composables 实现逻辑复用
- **更小的打包体积**：Tree-shaking 友好

#### Pinia vs Vuex

- **更简单的 API**：没有 mutations，只有 state、getters、actions
- **完整的 TypeScript 支持**：自动类型推断
- **更小的体积**：约 1KB
- **DevTools 支持**：完整的调试支持

#### Tauri vs Electron

- **更小的打包体积**：约 3-10MB vs 150MB+
- **更好的性能**：原生 WebView vs Chromium
- **更好的安全性**：Rust 后端 vs Node.js

## 目录结构

```
src/
├── components/              # Vue 组件
│   ├── AIDialog.vue        # AI 解析对话框
│   ├── Calendar.vue        # 日历组件
│   ├── ConfirmDialog.vue   # 确认对话框
│   ├── Icon.vue            # 图标组件（可复用）
│   ├── Loading.vue         # 加载组件（可复用）
│   ├── Modal.vue           # 模态框组件（可复用）
│   ├── OperationLogViewer.vue # 操作日志查看器
│   ├── SettingsPanel.vue   # 设置面板
│   ├── Toast.vue           # 消息提示组件
│   └── TodoItem.vue        # 待办事项组件
├── constants/              # 常量定义
│   └── model.ts            # AI 模型相关常量
├── services/               # 服务层
│   ├── api.ts              # Tauri API 封装
│   └── openaiApi.ts        # OpenAI API 封装
├── stores/                 # Pinia 状态管理
│   ├── modelStore.ts       # AI 模型配置状态
│   └── todoStore.ts        # 待办事项状态
├── styles/                 # 全局样式
│   └── main.css            # 主样式文件
├── types/                  # TypeScript 类型定义
│   ├── global.d.ts         # 全局类型声明
│   ├── model.ts            # AI 模型类型
│   └── todo.ts             # 待办事项类型
├── utils/                  # 工具函数
│   ├── crypto.ts           # 加密工具
│   ├── dateUtils.ts        # 日期处理工具
│   ├── loading.ts          # 加载状态工具
│   ├── logger.ts           # 日志工具
│   └── toast.ts            # 消息提示工具
├── App.vue                 # 根组件
└── main.ts                 # 应用入口
```

## 核心模块

### 1. 状态管理模块 (stores)

#### todoStore

待办事项状态管理，负责所有待办相关的状态和操作。

```typescript
// 核心状态
const todos = shallowRef<Todo[]>([]);        // 使用 shallowRef 优化性能
const filter = ref<FilterType>('all');        // 筛选类型
const selectedDate = ref(new Date());         // 选中日期
const isLoading = ref(false);                 // 加载状态

// 计算属性
const todoMap = computed(() => new Map());    // O(1) 查找优化
const filteredTodos = computed(() => []);     // 筛选后的待办
const stats = computed(() => ({}));           // 统计信息

// 核心方法
loadTodos()           // 加载所有待办
addTodoWithDate()     // 添加待办
toggleTodo()          // 切换完成状态
deleteTodo()          // 删除待办
setFilter()           // 设置筛选
setSelectedDate()     // 设置选中日期
```

#### modelStore

AI 模型配置状态管理，包含内存缓存优化。

```typescript
// 核心状态
const models = ref<ModelConfig[]>([]);        // 模型列表
const selectedModelId = ref<string>('');      // 选中的模型ID
const isTesting = ref(false);                 // 测试连接状态

// 内存缓存（模块级）
const apiKeyCache = new Map<string, string>();

// 核心方法
loadModels()              // 加载模型配置
addModel()                // 添加模型
updateModel()             // 更新模型
deleteModel()             // 删除模型
getDecryptedApiKey()      // 获取解密后的API密钥（带缓存）
testConnection()          // 测试连接
parseTodosWithAI()        // AI解析待办
clearApiKeyCache()        // 清除缓存
```

### 2. 服务层 (services)

#### api.ts

Tauri 后端 API 封装，提供类型安全的接口调用。

```typescript
// 待办事项 API
getTodos(): Promise<Todo[]>
addTodoWithDate(content, sortOrder, createdAt): Promise<Todo>
toggleTodo(id, completed): Promise<void>
deleteTodo(id): Promise<void>
updateTodoContent(id, content): Promise<void>
updateTodoOrder(id, sortOrder): Promise<void>

// 日志 API
getLogs(): Promise<LogEntry[]>
```

#### openaiApi.ts

OpenAI 兼容 API 封装，支持多种 AI 服务提供商。

```typescript
// 核心功能
buildApiUrl(baseUrl): string           // 构建完整 API URL
maskApiKey(apiKey): string             // 脱敏显示 API Key
chatCompletion(apiUrl, apiKey, request): Promise<Result>
```

### 3. 工具模块 (utils)

#### dateUtils.ts

日期处理工具函数。

```typescript
formatDate(date): string           // 格式化日期（今天/月日）
formatTime(timestamp): string      // 格式化时间
formatDateTime(timestamp): string  // 格式化日期时间
isSameDay(d1, d2): boolean         // 判断同一天
getDateRange(date): {start, end}   // 获取日期范围
```

#### crypto.ts

加密工具，用于 API 密钥加密存储。

```typescript
encryptApiKey(plainText): Promise<string>   // 加密
decryptApiKey(encryptedText): Promise<string> // 解密
```

#### logger.ts

统一日志工具，支持多种日志类型。

```typescript
// 日志方法
debug(category, message, data?)
info(category, message, data?)
warn(category, message, data?)
error(category, message, data?)

// 操作日志
operation(type, object, description, result)

// 系统日志
system(action, target, details)

// 性能追踪
time(category, message, fn)
```

#### toast.ts & loading.ts

全局消息提示和加载状态管理。

```typescript
// Toast 消息提示
showToast(message, type): void

// Loading 加载状态
showLoading(): void
hideLoading(): void
withLoading(fn): Promise<T>  // 自动管理加载状态
```

## 组件设计

### 可复用组件

#### Icon 组件

统一的图标组件，封装所有 SVG 图标。

```vue
<Icon name="calendar" :size="18" />
<Icon name="loading" :size="32" color="var(--accent-color)" />
```

支持的图标：calendar, ai, settings, close, plus, delete, edit, chevron-left, chevron-right, check, eye, folder, loading, checkbox, checkbox-checked

#### Modal 组件

基础模态框组件，提供统一的弹窗体验。

```vue
<Modal v-model:visible="showModal" title="标题" @close="handleClose">
  <template #default>内容</template>
  <template #footer>底部</template>
</Modal>
```

特性：
- ESC 键关闭
- 点击遮罩关闭（可配置）
- 自动滚动锁定
- 过渡动画

#### Loading 组件

全局加载状态组件，支持多次调用叠加。

```vue
<Loading />
```

### 业务组件

#### TodoItem

待办事项组件，展示单个待办。

#### Calendar

日历组件，支持日期选择和导航。

#### SettingsPanel

设置面板，包含通用设置和模型配置。

#### AIDialog

AI 解析对话框，支持自然语言解析待办。

## 最佳实践

### 1. 性能优化

#### 使用 shallowRef

对于大型数组或对象，使用 `shallowRef` 替代 `ref`，避免深层响应式开销。

```typescript
// 推荐
const todos = shallowRef<Todo[]>([]);

// 不推荐（大数组）
const todos = ref<Todo[]>([]);
```

#### 计算属性优化

使用 Map 结构优化查找性能。

```typescript
// 推荐：O(1) 查找
const todoMap = computed(() => {
  const map = new Map<string, Todo>();
  for (const todo of todos.value) {
    map.set(todo.id, todo);
  }
  return map;
});

// 使用
const todo = todoMap.value.get(id);
```

#### 避免重复计算

缓存计算结果，避免在循环中重复计算。

```typescript
// 推荐：提前计算
const today = new Date();
today.setHours(0, 0, 0, 0);

// 在循环中使用缓存的 today
```

### 2. 内存管理

#### API 密钥缓存

使用内存缓存减少重复解密操作。

```typescript
// 模块级缓存
const apiKeyCache = new Map<string, string>();

async function getDecryptedApiKey(id: string): Promise<string> {
  // 先查缓存
  const cached = apiKeyCache.get(id);
  if (cached) return cached;
  
  // 解密并缓存
  const decrypted = await decryptApiKey(encrypted);
  apiKeyCache.set(id, decrypted);
  return decrypted;
}
```

#### 及时清理

在删除或更新时清理相关缓存。

```typescript
function deleteModel(id: string) {
  models.value = models.value.filter(m => m.id !== id);
  apiKeyCache.delete(id);  // 清理缓存
}
```

### 3. 代码组织

#### Composables 抽象

将可复用逻辑抽象为 Composables。

```typescript
// useLoading.ts
export function useLoading() {
  const loading = ref(false);
  
  const withLoading = async <T>(fn: () => Promise<T>): Promise<T> => {
    loading.value = true;
    try {
      return await fn();
    } finally {
      loading.value = false;
    }
  };
  
  return { loading, withLoading };
}
```

#### 组件职责单一

每个组件只负责一个功能点。

- `Icon.vue` - 只负责图标渲染
- `Modal.vue` - 只负责模态框结构
- `Loading.vue` - 只负责加载状态展示

### 4. 类型安全

#### 严格的类型定义

```typescript
// types/todo.ts
export interface Todo {
  id: string;
  content: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  created_at: number;
  completed_at: number | null;
  sort_order: number;
}

export type FilterType = 'all' | 'active' | 'completed';
```

#### Props 类型声明

```typescript
const props = defineProps<{
  todo: Todo;
  visible: boolean;
  title?: string;
}>();

const emit = defineEmits<{
  close: [];
  confirm: [id: string];
}>();
```

### 5. 样式规范

#### CSS 变量使用

使用 CSS 变量实现主题化。

```css
.todo-item {
  background: var(--bg-primary);
  color: var(--text-primary);
  border-color: var(--border-color);
}
```

#### Scoped 样式

所有组件样式使用 `scoped` 避免污染。

```vue
<style scoped>
/* 组件样式 */
</style>
```

### 6. 错误处理

#### 统一错误处理

```typescript
async function loadTodos() {
  isLoading.value = true;
  try {
    todos.value = await api.getTodos();
  } catch (e) {
    await logger.error('Store', 'Failed to load todos', { error: e });
    showToast('加载失败', 'error');
  } finally {
    isLoading.value = false;
  }
}
```

#### 日志记录

关键操作记录日志。

```typescript
await operation('任务管理', '任务', `添加任务: ${content}`, '成功');
```

## 扩展指南

### 添加新组件

1. 在 `src/components/` 创建组件文件
2. 使用 Composition API 和 TypeScript
3. 遵循命名规范：PascalCase
4. 样式使用 scoped

### 添加新 Store

1. 在 `src/stores/` 创建 Store 文件
2. 使用 Pinia defineStore
3. 导出 composable 函数
4. 添加类型定义

### 添加新 API

1. 在 `src/services/api.ts` 添加前端接口
2. 在 `src-tauri/src/commands.rs` 添加 Rust 命令
3. 在 `src-tauri/src/lib.rs` 注册命令

## 相关文档

- [README.md](../README.md) - 项目介绍
- [CHANGELOG.md](../CHANGELOG.md) - 更新日志
- [LICENSE](../LICENSE) - 许可证
