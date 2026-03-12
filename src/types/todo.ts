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
export type TimeFilterType = 'day' | 'week' | 'month' | 'year' | 'all';
