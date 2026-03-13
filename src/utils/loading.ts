export function showLoading(): void {
  window.dispatchEvent(new CustomEvent('loading-show'));
}

export function hideLoading(): void {
  window.dispatchEvent(new CustomEvent('loading-hide'));
}

export async function withLoading<T>(fn: () => Promise<T>): Promise<T> {
  showLoading();
  try {
    return await fn();
  } finally {
    hideLoading();
  }
}
