import type { AppSettings } from '../types';

const key = 'acro-snap:settings';

export const defaultSettings: AppSettings = {
  aiEndpoint: '',
  aiApiKey: '',
  aiModel: 'gpt-4o-mini',
  supabaseUrl: '',
  supabaseAnonKey: ''
};

export function loadSettings(): AppSettings {
  const raw = localStorage.getItem(key);
  if (!raw) return defaultSettings;
  try {
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(key, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent('acro-settings-updated'));
}
