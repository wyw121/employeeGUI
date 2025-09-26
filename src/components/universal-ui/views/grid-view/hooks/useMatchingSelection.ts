import { useCallback, useEffect, useState } from 'react';
import { loadLatestMatching, saveLatestMatching } from '../matchingCache';

interface UseMatchingSelectionParams {
  onLatestMatchingChange?: (m: { strategy: string; fields: string[] }) => void;
  initialMatching?: { strategy: string; fields: string[] } | null;
}

export function useMatchingSelection({ onLatestMatchingChange, initialMatching }: UseMatchingSelectionParams) {
  const [currentStrategy, setCurrentStrategy] = useState<string>(initialMatching?.strategy || 'standard');
  const [currentFields, setCurrentFields] = useState<string[]>(initialMatching?.fields || []);

  // 初次尝试加载缓存（若 initialMatching 未提供）
  useEffect(() => {
    if (initialMatching) return; // 以外部初始为准
    try {
      const cached = loadLatestMatching();
      if (cached) {
        setCurrentStrategy(cached.strategy);
        setCurrentFields(Array.isArray(cached.fields) ? cached.fields : []);
      }
    } catch { /* ignore */ }
  }, [initialMatching]);

  const updateStrategy = useCallback((s: string) => {
    setCurrentStrategy(s);
    const payload = { strategy: s, fields: currentFields };
    onLatestMatchingChange?.(payload);
    saveLatestMatching(payload);
  }, [currentFields, onLatestMatchingChange]);

  const updateFields = useCallback((fs: string[]) => {
    setCurrentFields(fs);
    const payload = { strategy: currentStrategy, fields: fs };
    onLatestMatchingChange?.(payload);
    saveLatestMatching(payload);
  }, [currentStrategy, onLatestMatchingChange]);

  return { currentStrategy, currentFields, updateStrategy, updateFields } as const;
}
