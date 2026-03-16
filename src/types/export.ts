import type { PriorityType } from './todo';

export type ImportStrategy = 'merge' | 'replace' | 'skip_duplicates';

export interface ExportData {
  version: string;
  exportedAt: string;
  app: string;
  appVersion: string;
  todos: ExportedTodo[];
  metadata?: ExportMetadata;
}

export interface ExportedTodo {
  id: string;
  content: string;
  completed: boolean;
  priority: PriorityType;
  created_at: number;
  completed_at: number | null;
  sort_order: number;
}

export interface ExportMetadata {
  totalCount: number;
  completedCount: number;
  activeCount: number;
}

export interface ImportResult {
  success: boolean;
  total: number;
  imported: number;
  skipped: number;
  errors: string[];
}
