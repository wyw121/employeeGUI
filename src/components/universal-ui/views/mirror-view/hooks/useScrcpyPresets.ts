import { useEffect, useMemo, useState } from 'react';
import type { ScrcpyOptions } from '../../../../../application/services/ScrcpyApplicationService';

export type ScrcpyPreset = {
  id: string;
  name: string;
  options: ScrcpyOptions;
  builtIn?: boolean;
};

const BUILTIN_PRESETS: ScrcpyPreset[] = [
  {
    id: 'default:smooth',
    name: '流畅优先 (720p/8M/60fps)',
    options: { resolution: '1280', bitrate: '8M', maxFps: 60 },
    builtIn: true,
  },
  {
    id: 'default:clear',
    name: '清晰优先 (1080p/16M/60fps)',
    options: { resolution: '1920', bitrate: '16M', maxFps: 60 },
    builtIn: true,
  },
  {
    id: 'default:power',
    name: '省电优先 (720p/4M/30fps)',
    options: { resolution: '1280', bitrate: '4M', maxFps: 30 },
    builtIn: true,
  },
];

const LS_KEY = 'scrcpy.presets.v1';

export function useScrcpyPresets() {
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

  const all = useMemo(() => [...BUILTIN_PRESETS, ...custom], [custom]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(custom));
    } catch {}
  }, [custom]);

  const savePreset = (name: string, options: ScrcpyOptions) => {
    const id = `user:${Date.now()}`;
    const preset: ScrcpyPreset = { id, name, options };
    setCustom(prev => [preset, ...prev]);
    return preset;
  };

  const removePreset = (id: string) => {
    setCustom(prev => prev.filter(p => p.id !== id));
  };

  return { presets: all, savePreset, removePreset };
}
