export interface Todo {
  id: string;
  content: string;
  completed: boolean;
  priority: PriorityType;
  created_at: number;
  completed_at: number | null;
  sort_order: number;
}

export type PriorityType = 'low' | 'medium' | 'high';

export type FilterType = 'all' | 'active' | 'completed';

export interface PriorityOption {
  value: PriorityType;
  label: string;
  color: string;
}
