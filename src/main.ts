import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./styles/main.css";

function loadAndApplyTheme() {
  try {
    const savedSettings = localStorage.getItem('app_settings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      if (settings.themeColor) {
        document.documentElement.style.setProperty('--accent-color', settings.themeColor);
        document.documentElement.style.setProperty('--accent-color-alpha', settings.themeColor + '1a');
      }
    }
  } catch (e) {
    console.error('Failed to load theme:', e);
  }
}

loadAndApplyTheme();

const app = createApp(App);
app.use(createPinia());
app.mount("#app");
