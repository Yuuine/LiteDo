export {};

declare global {
  interface WindowEventMap {
    toast: CustomEvent<{ message: string; type: 'success' | 'error' | 'info' }>;
  }
}
