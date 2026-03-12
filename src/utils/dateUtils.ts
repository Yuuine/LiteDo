/**
 * 日期工具函数
 */

/**
 * 格式化日期为友好格式
 * @param date - 日期对象
 * @returns 格式化后的日期字符串
 */
export function formatDate(date: Date): string {
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return '今天';
  return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
}

/**
 * 格式化时间戳为时间字符串
 * @param timestamp - Unix 时间戳（秒）
 * @returns 格式化后的时间字符串
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

/**
 * 格式化时间戳为日期时间字符串
 * @param timestamp - Unix 时间戳（秒）
 * @returns 格式化后的日期时间字符串
 */
export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * 判断两个日期是否为同一天
 * @param d1 - 第一个日期
 * @param d2 - 第二个日期
 * @returns 是否为同一天
 */
export function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

/**
 * 获取日期范围的开始和结束时间戳
 * @param date - 日期对象
 * @returns 包含开始和结束时间戳的对象
 */
export function getDateRange(date: Date): { start: number; end: number } {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return {
    start: Math.floor(start.getTime() / 1000),
    end: Math.floor(end.getTime() / 1000)
  };
}
