import { useEffect, useMemo, useState } from 'react';
import type { ScrcpyOptions } from '../../../../../application/services/ScrcpyApplicationService';
import { BUILTIN_PRESETS, type ScrcpyPreset } from './presets';

const LS_KEY = 'scrcpy.presets.v1';

export function usePresets() {
  const [custom, setCustom] = useState<ScrcpyPreset[]>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw) as ScrcpyPreset[];
      return Array.isArray(arr) ? arr.filter(p => !p.builtIn) : [];
    } catch {
      return [];
    }
  });

  const presets = useMemo(() => [...BUILTIN_PRESETS, ...custom], [custom]);

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(custom)); } catch {}
  }, [custom]);

  const savePreset = (name: string, options: ScrcpyOptions) => {
    const id = `user:${Date.now()}`;
    const preset: ScrcpyPreset = { id, name, options };
    setCustom(prev => [preset, ...prev]);
    return preset;
  };

  const removePreset = (id: string) => setCustom(prev => prev.filter(p => p.id !== id));

  return { presets, savePreset, removePreset };
}
