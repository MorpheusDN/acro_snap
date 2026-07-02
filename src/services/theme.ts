import { useEffect, useState } from 'react';

export type ThemeMode = 'dark' | 'light';

const themeKey = 'acro-snap:theme';

export function getTheme(): ThemeMode {
  const value = localStorage.getItem(themeKey);
  return value === 'light' ? 'light' : 'dark';
}

export function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
}

export function setTheme(theme: ThemeMode) {
  localStorage.setItem(themeKey, theme);
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent('acro-theme-updated', { detail: theme }));
}

export function toggleTheme(theme: ThemeMode): ThemeMode {
  const next = theme === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

export function useThemeMode() {
  const [theme, setThemeState] = useState<ThemeMode>(() => getTheme());

  useEffect(() => {
    applyTheme(theme);

    const syncTheme = () => setThemeState(getTheme());
    const syncCustomTheme = (event: Event) => {
      const next = (event as CustomEvent<ThemeMode>).detail;
      if (next) setThemeState(next);
    };

    window.addEventListener('storage', syncTheme);
    window.addEventListener('acro-theme-updated', syncCustomTheme);
    return () => {
      window.removeEventListener('storage', syncTheme);
      window.removeEventListener('acro-theme-updated', syncCustomTheme);
    };
  }, [theme]);

  function toggle() {
    setThemeState((current) => toggleTheme(current));
  }

  return { theme, toggle };
}
