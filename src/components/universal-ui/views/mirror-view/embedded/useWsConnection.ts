import { useEffect, useRef, useState } from 'react';
import type { PlayerStatus, WsScrcpyConfig } from './types';

export function useWsConnection(cfg?: WsScrcpyConfig) {
  const [status, setStatus] = useState<PlayerStatus>({ state: 'idle' });
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!cfg?.url) return;
    setStatus({ state: 'connecting' });
    const ws = new WebSocket(cfg.url);
    socketRef.current = ws;

    ws.binaryType = 'arraybuffer';
    ws.onopen = () => setStatus({ state: 'connected' });
    ws.onerror = (e) => setStatus({ state: 'error', error: 'WebSocket 连接错误' });
    ws.onclose = () => setStatus({ state: 'idle' });

    return () => { try { ws.close(); } catch {} socketRef.current = null; };
  }, [cfg?.url]);

  const send = (data: ArrayBuffer | string) => {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(data);
    return true;
  };

  return { status, socketRef, send };
}
