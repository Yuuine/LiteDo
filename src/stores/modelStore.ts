import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  ModelConfig,
  CreateModelInput,
  UpdateModelInput,
  AIParseResult,
  ParsedTodo,
  ConnectionTestResult,
} from '../types/model';
import { encryptApiKey, decryptApiKey } from '../utils/crypto';
import { chatCompletion } from '../services/openaiApi';
import { STORAGE_KEYS, AI_PROMPTS, API_CONFIG, PRIORITY_LEVELS } from '../constants/model';
import logger, { operation } from '../utils/logger';

const LOG_TAG = 'ModelStore';

const apiKeyCache = new Map<string, string>();

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function getTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

export const useModelStore = defineStore('model', () => {
  const models = ref<ModelConfig[]>([]);
  const selectedModelId = ref<string>('');
  const isTesting = ref(false);

  const selectedModel = computed(() =>
    models.value.find((m) => m.id === selectedModelId.value)
  );

  const hasModels = computed(() => models.value.length > 0);

  async function loadModels(): Promise<void> {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MODEL_CONFIGS);
      if (saved) {
        const data = JSON.parse(saved);
        models.value = data.models || [];
        selectedModelId.value = data.selectedModelId || '';
      }
      await logger.info(LOG_TAG, '模型配置加载完成', {
        count: models.value.length,
        selectedId: selectedModelId.value || 'none',
      });
    } catch (e) {
      await logger.error(LOG_TAG, '模型配置加载失败', { error: e });
    }
  }

  async function saveModels(): Promise<void> {
    try {
      localStorage.setItem(
        STORAGE_KEYS.MODEL_CONFIGS,
        JSON.stringify({
          models: models.value,
          selectedModelId: selectedModelId.value,
        })
      );
      await logger.info(LOG_TAG, '模型配置保存完成', {
        count: models.value.length,
        selectedId: selectedModelId.value || 'none',
      });
    } catch (e) {
      await logger.error(LOG_TAG, '模型配置保存失败', { error: e });
    }
  }

  async function addModel(config: CreateModelInput): Promise<ModelConfig> {
    await logger.info(LOG_TAG, '开始添加模型', {
      name: config.name,
      apiUrl: config.apiUrl,
      modelName: config.modelName,
    });

    const encryptedKey = await encryptApiKey(config.apiKey);
    const now = getTimestamp();

    const newModel: ModelConfig = {
      ...config,
      id: generateId(),
      apiKey: encryptedKey,
      createdAt: now,
      updatedAt: now,
    };

    models.value.push(newModel);
    await saveModels();

    await logger.info(LOG_TAG, '模型添加成功', {
      id: newModel.id,
      name: newModel.name,
    });

    return newModel;
  }

  async function updateModel(id: string, updates: UpdateModelInput): Promise<void> {
    const index = models.value.findIndex((m) => m.id === id);
    if (index === -1) {
      await logger.error(LOG_TAG, '更新模型失败：模型不存在', { id });
      return;
    }

    await logger.info(LOG_TAG, '开始更新模型', {
      id,
      updates: {
        ...updates,
        apiKey: updates.apiKey ? '***已更新***' : undefined,
      },
    });

    const processedUpdates = { ...updates };
    if (processedUpdates.apiKey) {
      processedUpdates.apiKey = await encryptApiKey(processedUpdates.apiKey);
      apiKeyCache.delete(id);
    }

    models.value[index] = {
      ...models.value[index],
      ...processedUpdates,
      updatedAt: getTimestamp(),
    };

    await saveModels();
    await logger.info(LOG_TAG, '模型更新成功', { id });
  }

  async function deleteModel(id: string): Promise<void> {
    const model = models.value.find((m) => m.id === id);

    await logger.info(LOG_TAG, '开始删除模型', {
      id,
      name: model?.name,
    });

    models.value = models.value.filter((m) => m.id !== id);
    apiKeyCache.delete(id);

    if (selectedModelId.value === id) {
      selectedModelId.value = models.value[0]?.id || '';
    }

    await saveModels();
    await logger.info(LOG_TAG, '模型删除成功', { id });
  }

  async function getDecryptedApiKey(id: string): Promise<string> {
    const cachedKey = apiKeyCache.get(id);
    if (cachedKey) {
      return cachedKey;
    }

    const model = models.value.find((m) => m.id === id);
    if (!model) {
      await logger.error(LOG_TAG, 'API密钥解密失败：模型不存在', { id });
      return '';
    }

    const decrypted = await decryptApiKey(model.apiKey);
    
    if (decrypted) {
      apiKeyCache.set(id, decrypted);
    }

    await logger.info(LOG_TAG, 'API密钥解密完成', {
      id,
      success: !!decrypted,
    });

    return decrypted;
  }

  function clearApiKeyCache(id?: string): void {
    if (id) {
      apiKeyCache.delete(id);
    } else {
      apiKeyCache.clear();
    }
  }

  async function testConnection(modelId: string): Promise<ConnectionTestResult> {
    const model = models.value.find((m) => m.id === modelId);
    if (!model) {
      return { success: false, error: '模型不存在' };
    }

    const apiKey = await getDecryptedApiKey(modelId);
    return testConnectionDirect(model.apiUrl, apiKey, model.modelName);
  }

  async function testConnectionDirect(
    apiUrl: string,
    apiKey: string,
    modelName: string
  ): Promise<ConnectionTestResult> {
    isTesting.value = true;

    await logger.info(LOG_TAG, '开始测试连接', {
      baseUrl: apiUrl,
      modelName,
    });

    try {
      const result = await chatCompletion(apiUrl, apiKey, {
        model: modelName,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: API_CONFIG.TEST_MAX_TOKENS,
      });

      if (result.success) {
        await operation('模型管理', '连接测试', `测试连接成功: ${modelName}`, '成功');
      } else {
        await operation('模型管理', '连接测试', `测试连接失败: ${result.error}`, '失败');
      }

      return {
        success: result.success,
        error: result.error,
      };
    } catch (e) {
      await operation('模型管理', '连接测试', `测试连接异常: ${e}`, '失败');
      return { success: false, error: String(e) };
    } finally {
      isTesting.value = false;
    }
  }

  async function parseTodosWithAI(modelId: string, text: string, priorityEnabled: boolean = true): Promise<AIParseResult> {
    const model = models.value.find((m) => m.id === modelId);
    if (!model) {
      await logger.error(LOG_TAG, 'AI解析失败：模型不存在', { modelId });
      return { success: false, todos: [], error: '模型不存在' };
    }

    await logger.info(LOG_TAG, '开始AI解析', {
      modelId,
      modelName: model.modelName,
      inputLength: text.length,
      priorityEnabled,
    });

    const apiKey = await getDecryptedApiKey(modelId);
    
    const systemPrompt = priorityEnabled 
      ? AI_PROMPTS.TODO_PARSER 
      : AI_PROMPTS.TODO_PARSER_NO_PRIORITY;

    const result = await chatCompletion(model.apiUrl, apiKey, {
      model: model.modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      temperature: API_CONFIG.DEFAULT_TEMPERATURE,
      max_tokens: API_CONFIG.PARSE_MAX_TOKENS,
    });

    if (!result.success || !result.data) {
      return { success: false, todos: [], error: result.error };
    }

    const content = result.data.choices?.[0]?.message?.content;

    if (!content) {
      await logger.error(LOG_TAG, 'AI返回内容为空');
      return { success: false, todos: [], error: 'AI返回内容为空' };
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      await logger.error(LOG_TAG, '无法解析JSON', { content });
      return { success: false, todos: [], error: '无法解析AI返回结果' };
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const todos: ParsedTodo[] = (parsed.todos || [])
        .map((t: ParsedTodo) => ({
          content: t.content?.trim() || '',
          priority: priorityEnabled && PRIORITY_LEVELS.includes(t.priority) ? t.priority : 'medium',
        }))
        .filter((t: ParsedTodo) => t.content);

      await logger.info(LOG_TAG, 'AI解析成功', {
        todoCount: todos.length,
        elapsed: `${result.elapsed}ms`,
      });

      return { success: true, todos };
    } catch (e) {
      await logger.error(LOG_TAG, 'JSON解析失败', { error: e });
      return { success: false, todos: [], error: 'JSON解析失败' };
    }
  }

  function selectModel(id: string): void {
    const model = models.value.find((m) => m.id === id);
    if (model) {
      selectedModelId.value = id;
      saveModels();
      logger.info(LOG_TAG, '切换选中模型', {
        id,
        name: model.name,
      });
      operation('模型管理', '模型选择', `选择模型: ${model.name}`, '成功');
    } else {
      logger.error(LOG_TAG, '切换模型失败：模型不存在', { id });
      operation('模型管理', '模型选择', `选择模型失败: 模型不存在`, '失败');
    }
  }

  loadModels();

  return {
    models,
    selectedModelId,
    selectedModel,
    hasModels,
    isTesting,
    loadModels,
    addModel,
    updateModel,
    deleteModel,
    testConnection,
    testConnectionDirect,
    parseTodosWithAI,
    selectModel,
    getDecryptedApiKey,
    clearApiKeyCache,
  };
});
