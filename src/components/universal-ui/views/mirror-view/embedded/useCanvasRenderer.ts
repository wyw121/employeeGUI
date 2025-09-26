import { useCallback, useRef } from 'react';

export function useCanvasRenderer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const draw = useCallback((frame: VideoFrame) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    try {
      // 使用 drawImage 渲染 VideoFrame 到 Canvas
      // 为避免阻塞，实际可使用 WebGL/WebGPU 进一步加速
      ctx.drawImage(frame as any, 0, 0, canvas.width, canvas.height);
    } finally {
      try { frame.close(); } catch {}
    }
  }, []);

  return { canvasRef, draw };
}
