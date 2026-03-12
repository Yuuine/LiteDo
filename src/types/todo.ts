export interface Todo {
  id: string;
  content: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  created_at: number;
  completed_at: number | null;
}

export type FilterType = 'all' | 'active' | 'completed';
