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
      "priority": "low|medium|high",
    }
  ]
}

解析规则与要求：
1. 任务识别与拆分：
   - 仔细识别文本中所有独立的任务点，确保每个行动项都被单独解析。
   - 若一个句子包含多个用“和”、“以及”、“同时”等连词连接的独立动作，应将其拆分为多个待办事项。
   - 示例：将“给客户发邮件并更新项目计划”拆分为两个独立任务。

2. 内容（content）字段优化：
   - 提炼核心动作与目标对象，形成“动词 + 核心宾语/目标”的简洁结构。
   - 移除所有时间（如“明天下午”）、日期（如“下周一”）、地点及模糊修饰词（如“尽快”、“抽空”）。
   - 确保描述具体、可执行。将“处理一下报告”优化为“整理销售数据报告”，将“准备会议”优化为“起草项目评审会议议程”。
   - 避免使用“完成”、“进行”等笼统动词，使用“起草”、“审核”、“致电”、“购买”等具体动词。

3. 优先级（priority）判定标准：
   - high（高）：涉及紧迫截止日期、关键路径阻塞、重要客户问题或可能产生重大影响的任务。
   - medium（中）：有明确时间要求但不极度紧迫，或属于常规推进的重要任务。
   - low（低）：无明确时间要求、可延后处理或属于优化、学习类任务。

4. 输出格式：
   - 严格遵循上述JSON格式，只返回一个合法的JSON对象，不包含任何额外的解释、前缀或后缀文本。
   - 确保JSON语法完全正确，可直接被解析。`
} as const;

export const API_CONFIG = {
  DEFAULT_TIMEOUT: 30000,
  TEST_MAX_TOKENS: 5,
  PARSE_MAX_TOKENS: 1000,
  DEFAULT_TEMPERATURE: 0.3,
} as const;

export const PRIORITY_LEVELS = ['low', 'medium', 'high'] as const;
