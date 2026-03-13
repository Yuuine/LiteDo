export interface ModelConfig {
  id: string;
  name: string;
  apiUrl: string;
  apiKey: string;
  modelName: string;
  createdAt: number;
  updatedAt: number;
}

export type CreateModelInput = Omit<ModelConfig, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateModelInput = Partial<Omit<ModelConfig, 'id' | 'createdAt'>>;

export interface ParsedTodo {
  content: string;
  priority: 'low' | 'medium' | 'high';
}

export interface AIParseResult {
  success: boolean;
  todos: ParsedTodo[];
  error?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  error?: string;
}
