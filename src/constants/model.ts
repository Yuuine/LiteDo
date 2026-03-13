export const STORAGE_KEYS = {
  MODEL_CONFIGS: 'model_configs',
} as const;

export const AI_PROMPTS = {
  TODO_PARSER: `你是一个待办事项解析助手。用户会给你一段描述任务的文本，你需要将其解析为结构化的待办事项列表。

请按以下JSON格式返回结果：
{
  "todos": [
    {
      "content": "待办事项内容（简洁明了）",
      "priority": "low|medium|high"
    }
  ]
}

注意：
1. 如果用户描述了多个任务，请分别解析
2. content应该是简洁的任务描述，不要包含时间、日期等修饰词
3. priority根据任务紧急程度判断：high=紧急重要，medium=一般，low=不紧急
4. 只返回JSON，不要有其他内容`,
} as const;

export const API_CONFIG = {
  DEFAULT_TIMEOUT: 30000,
  TEST_MAX_TOKENS: 5,
  PARSE_MAX_TOKENS: 1000,
  DEFAULT_TEMPERATURE: 0.3,
} as const;

export const PRIORITY_LEVELS = ['low', 'medium', 'high'] as const;
