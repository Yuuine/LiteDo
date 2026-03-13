import { ref, computed } from 'vue';
import { DEFAULT_FONT_THEME } from '../constants/model';
import type { FontThemeKey } from '../stores/todoStore';

interface AppSettings {
  autoStart: boolean;
  themeColor: string;
  priorityEnabled: boolean;
  sortByPriority: boolean;
  fontTheme: FontThemeKey;
}

const DEFAULT_SETTINGS: AppSettings = {
  autoStart: false,
  themeColor: '#6366f1',
  priorityEnabled: false,
  sortByPriority: false,
  fontTheme: DEFAULT_FONT_THEME as FontThemeKey,
};

const STORAGE_KEY = 'app_settings';

const settings = ref<AppSettings>(loadSettings());

function loadSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export function useSettings() {
  const themeColor = computed({
    get: () => settings.value.themeColor,
    set: (value) => {
      settings.value.themeColor = value;
      saveSettings();
    },
  });

  const autoStart = computed({
    get: () => settings.value.autoStart,
    set: (value) => {
      settings.value.autoStart = value;
      saveSettings();
    },
  });

  const priorityEnabled = computed({
    get: () => settings.value.priorityEnabled,
    set: (value) => {
      settings.value.priorityEnabled = value;
      saveSettings();
    },
  });

  const sortByPriority = computed({
    get: () => settings.value.sortByPriority,
    set: (value) => {
      settings.value.sortByPriority = value;
      saveSettings();
    },
  });

  const fontTheme = computed({
    get: () => settings.value.fontTheme,
    set: (value) => {
      settings.value.fontTheme = value;
      saveSettings();
    },
  });

  function updateSettings(newSettings: Partial<AppSettings>): void {
    settings.value = { ...settings.value, ...newSettings };
    saveSettings();
  }

  function resetSettings(): void {
    settings.value = { ...DEFAULT_SETTINGS };
    saveSettings();
  }

  return {
    settings,
    themeColor,
    autoStart,
    priorityEnabled,
    sortByPriority,
    fontTheme,
    updateSettings,
    resetSettings,
    loadSettings,
    saveSettings,
  };
}
