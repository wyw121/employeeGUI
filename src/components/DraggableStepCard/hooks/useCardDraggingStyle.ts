import { CSS } from '@dnd-kit/utilities';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

export interface DragVisualOptions {
  transform: any;
  transition: string | undefined;
  isDragging: boolean;
}

/**
 * 统一计算卡片在拖拽过程中的 inline style
 * - 合并 reduced-motion 偏好：在偏好减少动态时，关闭旋转/缩放与复杂过渡
 * - 默认启用 will-change 与 contain，降低重绘成本
 */
export function useCardDraggingStyle(opts: DragVisualOptions): React.CSSProperties {
  const reducedMotion = usePrefersReducedMotion();
  const { transform, transition, isDragging } = opts;

  const base: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0.82 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    willChange: 'transform, opacity',
    contain: 'layout paint',
    backfaceVisibility: 'hidden',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  };

  if (reducedMotion) {
    // 在 reduced-motion 下，进一步去除旋转/缩放的二次样式，降低动态效果
    return {
      ...base,
      transition: undefined,
      opacity: isDragging ? 0.9 : 1,
    };
  }

  return base;
}
