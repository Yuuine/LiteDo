import type { PriorityType, PriorityOption } from '../types/todo';
import { PRIORITY_CONFIG, DEFAULT_PRIORITY } from '../constants/model';

export function getPriorityOptions(): PriorityOption[] {
  return Object.entries(PRIORITY_CONFIG).map(([value, config]) => ({
    value: value as PriorityType,
    label: config.label,
    color: config.color,
  }));
}

export function getPriorityLabel(priority: PriorityType): string {
  return PRIORITY_CONFIG[priority]?.label ?? PRIORITY_CONFIG[DEFAULT_PRIORITY].label;
}

export function getPriorityColor(priority: PriorityType): string {
  return PRIORITY_CONFIG[priority]?.color ?? PRIORITY_CONFIG[DEFAULT_PRIORITY].color;
}

export function getDefaultPriority(): PriorityType {
  return DEFAULT_PRIORITY;
}
