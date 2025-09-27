import { useEffect, useMemo, useState } from 'react';

// A lightweight, type-safe localStorage-backed state hook.
// - Key namespace is recommended per module.
// - JSON serialize/parse with basic error tolerance.
// - Optional validator to coerce/guard parsed value.
export function useLocalStorageState<T>(key: string, options: {
  defaultValue: T;
  validate?: (v: unknown) => v is T;
  migrate?: (v: unknown) => T; // optional migration from legacy formats
}): [T, (v: T | ((prev: T) => T)) => void] {
  const { defaultValue, validate, migrate } = options;

  const read = useMemo((): T => {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return defaultValue;
      const parsed = JSON.parse(raw);
      if (validate && !validate(parsed)) {
        return migrate ? migrate(parsed) : defaultValue;
      }
      return (parsed as T);
    } catch {
      return defaultValue;
    }
  }, [key, defaultValue, validate, migrate]);

  const [state, setState] = useState<T>(read);

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // ignore quota or serialization errors
    }
  }, [key, state]);

  return [state, setState];
}
