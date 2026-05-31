// Theme values: 'light' | 'dark'
const THEME_KEY = 'app-theme';

export function applyTheme(theme) {
  const root = document.documentElement;
  root.classList.remove('dark');
  if (theme === 'dark') {
    root.classList.add('dark');
  }
  localStorage.setItem(THEME_KEY, theme);
}

export function getTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) return saved;
  return 'dark'; // Default to dark theme
}

export function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) {
    applyTheme(saved);
  } else {
    // Default to dark theme
    applyTheme('dark');
  }
}

import { useState, useEffect } from 'react';

export function useTheme() {
  const [theme, setThemeState] = useState(getTheme);

  const setTheme = (newTheme) => {
    applyTheme(newTheme);
    setThemeState(newTheme);
  };

  useEffect(() => {
    setThemeState(getTheme());
  }, []);

  return [theme, setTheme];
}