// Theme values: 'light' | 'dark' | 'very-dark'
const THEME_KEY = 'app-theme';

export function applyTheme(theme) {
  const root = document.documentElement;
  root.classList.remove('dark', 'very-dark');
  if (theme === 'dark') root.classList.add('dark');
  if (theme === 'very-dark') {
    // also add 'dark' so Tailwind dark: variants apply
    root.classList.add('dark', 'very-dark');
  }
  localStorage.setItem(THEME_KEY, theme);
}

export function getTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) {
    applyTheme(saved);
  } else {
    // Auto-detect system color scheme on first visit
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
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