import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./styles/main.css";
import { FONT_THEME_CONFIG, DEFAULT_FONT_THEME } from "./constants/model";

function loadWebFont(url: string): void {
  if (document.querySelector(`link[href="${url}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
}

function loadAndApplyTheme() {
  try {
    const savedSettings = localStorage.getItem('app_settings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      if (settings.themeColor) {
        document.documentElement.style.setProperty('--accent-color', settings.themeColor);
        document.documentElement.style.setProperty('--accent-color-alpha', settings.themeColor + '1a');
      }
      if (settings.fontTheme && FONT_THEME_CONFIG[settings.fontTheme]) {
        const fontConfig = FONT_THEME_CONFIG[settings.fontTheme];
        document.documentElement.style.setProperty('--font-family-base', fontConfig.family);
        if (fontConfig.webFont) {
          loadWebFont(fontConfig.webFont);
        }
      }
    } else {
      document.documentElement.style.setProperty('--font-family-base', FONT_THEME_CONFIG[DEFAULT_FONT_THEME].family);
    }
  } catch (e) {
    console.error('Failed to load theme:', e);
    document.documentElement.style.setProperty('--font-family-base', FONT_THEME_CONFIG[DEFAULT_FONT_THEME].family);
  }
}

loadAndApplyTheme();

const app = createApp(App);
app.use(createPinia());
app.mount("#app");
