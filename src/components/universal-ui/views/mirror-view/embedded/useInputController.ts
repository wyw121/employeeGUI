import { useCallback } from 'react';

export function useInputController(send: (data: ArrayBuffer | string) => boolean) {
  // 简化：点击事件映射为坐标发送（具体协议取决于 ws-scrcpy 服务端定义）
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const payload = JSON.stringify({ t: 'tap', x, y });
    send(payload);
  }, [send]);

  return { handleClick };
}
