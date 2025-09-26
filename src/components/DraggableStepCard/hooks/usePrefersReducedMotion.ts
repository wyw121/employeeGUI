import { useEffect, useState } from 'react';

/**
 * 检测用户是否偏好“减少动态效果”（系统级设置）
 * - 返回 true 表示应减少或关闭动画/过渡/旋转缩放
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const listener = () => setReduced(!!mq.matches);
    listener();
    mq.addEventListener?.('change', listener);
    return () => mq.removeEventListener?.('change', listener);
  }, []);

  return reduced;
}
