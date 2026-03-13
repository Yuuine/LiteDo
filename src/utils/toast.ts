export type ToastType = 'success' | 'error' | 'info';

export function showToast(message: string, type: ToastType = 'success'): void {
  window.dispatchEvent(new CustomEvent('toast', { detail: { message, type } }));
}
