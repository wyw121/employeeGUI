/**
 * 智能懒加载Hook - 基于Intersection Observer
 */
import { useEffect, useRef, useState, RefObject } from 'react';

interface UseIntersectionObserverOptions {
  /** 触发阈值，默认0.1 */
  threshold?: number;
  /** 根边距，默认'50px' */
  rootMargin?: string;
  /** 根元素，默认null（viewport） */
  root?: Element | null;
  /** 是否只触发一次，默认true */
  triggerOnce?: boolean;
  /** 是否禁用（强制立即加载），默认false */
  disabled?: boolean;
}

export function useIntersectionObserver<T extends Element = HTMLDivElement>(
  options: UseIntersectionObserverOptions = {}
): [RefObject<T>, boolean] {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    root = null,
    triggerOnce = true,
    disabled = false
  } = options;

  const elementRef = useRef<T>(null);
  const [isIntersecting, setIsIntersecting] = useState(disabled);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // 如果禁用，直接设置为可见
    if (disabled) {
      setIsIntersecting(true);
      return;
    }

    const element = elementRef.current;
    if (!element) return;

    // 清理之前的观察器
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // 创建新的观察器
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        const isVisible = entry.isIntersecting;
        setIsIntersecting(isVisible);
        
        // 如果只触发一次且已经可见，停止观察
        if (triggerOnce && isVisible) {
          observerRef.current?.unobserve(element);
        }
      },
      {
        threshold,
        rootMargin,
        root,
      }
    );

    observerRef.current.observe(element);

    // 清理函数
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [threshold, rootMargin, root, triggerOnce, disabled]);

  return [elementRef, isIntersecting];
}

/**
 * 图片懒加载专用Hook
 */
interface UseImageLazyLoadOptions extends UseIntersectionObserverOptions {
  /** 是否启用懒加载，默认true */
  enabled?: boolean;
  /** 预加载距离，默认'100px' */
  preloadDistance?: string;
}

export function useImageLazyLoad<T extends Element = HTMLDivElement>(
  options: UseImageLazyLoadOptions = {}
): [RefObject<T>, boolean, boolean] {
  const {
    enabled = true,
    preloadDistance = '100px',
    ...observerOptions
  } = options;

  const [elementRef, isIntersecting] = useIntersectionObserver<T>({
    ...observerOptions,
    rootMargin: preloadDistance,
    disabled: !enabled,
  });

  const shouldLoad = !enabled || isIntersecting;

  return [elementRef, shouldLoad, isIntersecting];
}

export default useIntersectionObserver;