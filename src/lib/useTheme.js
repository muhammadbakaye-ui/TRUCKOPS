// Theme values: 'light' | 'dark' | 'very-dark'
const THEME_KEY = 'app-theme';

export function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(saved);
}

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
  return localStorage.getItem(THEME_KEY) || 'light';
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