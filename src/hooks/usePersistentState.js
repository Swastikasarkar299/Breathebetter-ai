import { useState, useEffect } from 'react';

export function usePersistentState(storageKey, fallbackValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : fallbackValue;
    } catch {
      return fallbackValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // ignore storage errors
    }
  }, [storageKey, value]);

  return [value, setValue];
}
