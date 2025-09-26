import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { scrcpyService } from '../services/ScrcpyApplicationService';

export interface ScrcpySessionEvent {
  deviceId: string;
  sessionName?: string;
  error?: string;
}

export function useScrcpySessions(deviceId?: string) {
  const [sessions, setSessions] = useState<string[]>([]);
  const [lastEvent, setLastEvent] = useState<ScrcpySessionEvent | null>(null);

  const refresh = async () => {
    if (!deviceId) { setSessions([]); return; }
    try { setSessions(await scrcpyService.listSessions(deviceId)); } catch { /* ignore */ }
  };

  useEffect(() => { refresh(); }, [deviceId]);

  useEffect(() => {
    const unsubs: Array<() => void> = [];
    (async () => {
      const s1 = await listen<ScrcpySessionEvent>('scrcpy://session-started', (e) => {
        setLastEvent(e.payload);
        if (!deviceId || e.payload.deviceId !== deviceId) return;
        refresh();
      });
      const s2 = await listen<ScrcpySessionEvent>('scrcpy://session-stopped', (e) => {
        setLastEvent(e.payload);
        if (!deviceId || e.payload.deviceId !== deviceId) return;
        refresh();
      });
      const s3 = await listen<ScrcpySessionEvent>('scrcpy://session-error', (e) => {
        setLastEvent(e.payload);
        if (!deviceId || e.payload.deviceId !== deviceId) return;
      });
      unsubs.push(() => s1(), () => s2(), () => s3());
    })();
    return () => { unsubs.forEach((fn) => fn()); };
  }, [deviceId]);

  return { sessions, lastEvent, refresh };
}
