import type { AppSettings } from '../types';

const key = 'acro-snap:settings';

export const defaultSettings: AppSettings = {
  aiEndpoint: 'https://ark.cn-beijing.volces.com/api/v3',
  aiApiKey: '',
  aiModel: 'doubao-seed-2-0-mini-260428',
  supabaseUrl: '',
  supabasePublishableKey: ''
};

export function loadSettings(): AppSettings {
  const raw = localStorage.getItem(key);
  if (!raw) return defaultSettings;
  try {
    const parsed = JSON.parse(raw);
    return {
      ...defaultSettings,
      ...parsed,
      supabasePublishableKey: parsed.supabasePublishableKey || parsed.supabaseAnonKey || ''
    };
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(key, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent('acro-settings-updated'));
}
