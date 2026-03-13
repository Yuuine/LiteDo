import { FONT_THEME_CONFIG } from '../constants/model';
import type { FontThemeKey } from '../stores/todoStore';

function applyThemeColor(color: string): void {
  document.documentElement.style.setProperty('--accent-color', color);
  document.documentElement.style.setProperty('--accent-color-alpha', color + '1a');
}

function applyFontTheme(theme: FontThemeKey): void {
  const config = FONT_THEME_CONFIG[theme];
  if (config) {
    document.documentElement.style.setProperty('--font-family-base', config.family);
    if (config.webFont) {
      loadWebFont(config.webFont);
    }
  }
}

function loadWebFont(url: string): void {
  if (document.querySelector(`link[href="${url}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
}

function applyOverlayBackground(opacity: number = 0.5): void {
  document.documentElement.style.setProperty('--overlay-bg', `rgba(0, 0, 0, ${opacity})`);
}

export function useTheme() {
  return {
    applyThemeColor,
    applyFontTheme,
    applyOverlayBackground,
    loadWebFont,
  };
}
