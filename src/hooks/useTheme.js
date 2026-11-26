import { useState, useEffect, useCallback } from 'react';

export function useTheme(defaultTheme = 'light') {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('bb_theme') || defaultTheme;
    } catch {
      return defaultTheme;
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('bb_theme', theme);
    } catch {
      // ignore storage failure
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, setTheme, toggleTheme };
}
