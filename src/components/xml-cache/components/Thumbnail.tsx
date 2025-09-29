import React from "react";
import { getCachedDataUrl, loadDataUrlWithCache } from "../utils/imageCache";
import { useImageLazyLoad } from "../../../hooks/useIntersectionObserver";
import { imageDebug, performance } from "../../../utils/debugUtils";

export interface ThumbnailProps {
  src?: string;
  alt?: string;
  width?: number;
  height?: number | string;
  borderRadius?: number;
  fullWidth?: boolean; // if true, use 100% width and keep aspect by height prop
  absolutePathForFallback?: string; // use when needing backend data-url fallback
  // Expansion behavior
  expandMode?: 'none' | 'hover' | 'click'; // default 'click' to avoid hover flicker in large lists
  collapsedHeight?: number | string; // collapsed height (default: height)
  maxExpandedHeight?: number | string; // e.g., '80vh' to avoid overscroll; default '80vh'
  // Lazy loading options
  enableLazyLoad?: boolean; // default true
  lazyLoadDistance?: string; // default '100px'
}

// A tiny image component that provides a graceful fallback when the image fails to load.
export const Thumbnail: React.FC<ThumbnailProps> = ({
  src,
  alt,
  width = 120,
  height = 72,
  borderRadius = 8,
  fullWidth = false,
  absolutePathForFallback,
  expandMode = 'click',
  collapsedHeight,
  maxExpandedHeight = '80vh',
  enableLazyLoad = true,
  lazyLoadDistance = '100px',
}) => {
  // 懒加载支持
  const [containerRef, shouldLoad, isVisible] = useImageLazyLoad({
    enabled: enableLazyLoad,
    preloadDistance: lazyLoadDistance,
  });
  
  // 图片状态
  const [imgSrc, setImgSrc] = React.useState<string | undefined>(undefined);
  const [triedFallback, setTriedFallback] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const [sourceType, setSourceType] = React.useState<'asset' | 'data' | 'none'>('none');
  
  // UI 状态
  const [hovered, setHovered] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const hoverTimer = React.useRef<number | null>(null);

  // 图片加载逻辑（仅在应该加载时执行）
  React.useEffect(() => {
    // 如果启用懒加载但还未可见，不加载
    if (!shouldLoad) {
      return;
    }
    
    let cancelled = false;
    const perfKey = `thumbnail-${absolutePathForFallback?.split(/[\\\/]/).pop() || 'unknown'}`;
    
    setLoaded(false);
    setTriedFallback(false);
    setSourceType('none');
    setImgSrc(undefined);
    
    performance.mark(`${perfKey}-start`);
    
    (async () => {
      if (absolutePathForFallback) {
        imageDebug.log(`🔍 尝试加载图片: ${absolutePathForFallback}`);
        const dataUrl = await loadDataUrlWithCache(absolutePathForFallback);
        if (!cancelled && dataUrl) {
          imageDebug.log(`📊 设置 data URL 源 (${(dataUrl.length/1024).toFixed(1)}KB)`);
          setImgSrc(dataUrl);
          setSourceType('data');
          performance.mark(`${perfKey}-loaded`);
          return;
        }
        // fallback to asset if available
        if (!cancelled && src) {
          imageDebug.verbose(`📊 回退到资源源: ${src}`);
          setImgSrc(src);
          setSourceType('asset');
        }
      } else if (src) {
        imageDebug.verbose(`� 使用资源源: ${src}`);
        setImgSrc(src);
        setSourceType('asset');
      } else {
        imageDebug.verbose('� 无图片源可用');
        setImgSrc(undefined);
        setSourceType('none');
      }
    })();
    
    return () => {
      cancelled = true;
    };
  }, [absolutePathForFallback, src, shouldLoad]);

  const handleError = React.useCallback(async (error: React.SyntheticEvent<HTMLImageElement, Event>) => {
    imageDebug.error(`🔴 图片加载错误: ${absolutePathForFallback}`, {
      sourceType,
      triedFallback,
      src: error.currentTarget.src,
    });
    
    // Only try once to avoid loops
    if (triedFallback || !absolutePathForFallback) {
      imageDebug.warn('🔴 不再重试，设置为无图片状态');
      setImgSrc(undefined);
      return;
    }
    setTriedFallback(true);
    
    // Check cache first
    const cached = getCachedDataUrl(absolutePathForFallback);
    if (cached) {
      imageDebug.log(`🔄 使用缓存重试: (${(cached.length/1024).toFixed(1)}KB)`);
      setImgSrc(cached);
      setSourceType("data");
      return;
    }
    
    imageDebug.log(`🔄 重新加载图片: ${absolutePathForFallback}`);
    const dataUrl = await loadDataUrlWithCache(absolutePathForFallback);
    if (dataUrl) {
      imageDebug.log(`🔄 重新加载成功: (${(dataUrl.length/1024).toFixed(1)}KB)`);
      setImgSrc(dataUrl);
      setSourceType("data");
      return;
    }
    
    imageDebug.error(`🔴 重新加载失败: ${absolutePathForFallback}`);
    setImgSrc(undefined);
    setSourceType("none");
  }, [absolutePathForFallback, triedFallback, sourceType]);

  const collapsedH = collapsedHeight ?? height;
  const isHoverExpanded = (expandMode === 'hover') && hovered && !!imgSrc && loaded;
  const isClickExpanded = (expandMode === 'click') && expanded && !!imgSrc;
  const isExpanded = isHoverExpanded || isClickExpanded;
  const maxH = maxExpandedHeight;
  const containerStyle: React.CSSProperties = {
    width: fullWidth ? "100%" : width,
    height: isExpanded ? 'auto' : collapsedH,
    borderRadius,
    overflow: "hidden",
    backgroundColor: "#111827",
    position: "relative",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #1f2937",
    transition: "max-height 160ms ease",
    maxHeight: isExpanded ? maxH : collapsedH,
  };

  const imgStyle: React.CSSProperties = isExpanded
    ? { width: "100%", height: "auto", objectFit: "contain", display: loaded ? "block" : "none" }
    : { width: "100%", height: "100%", objectFit: "cover", display: loaded ? "block" : "none" };

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      onMouseEnter={() => {
        if (expandMode === 'hover') {
          if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
          hoverTimer.current = window.setTimeout(() => setHovered(true), 120);
        } else {
          setHovered(true);
        }
      }}
      onMouseLeave={() => {
        if (hoverTimer.current) {
          window.clearTimeout(hoverTimer.current);
          hoverTimer.current = null;
        }
        setHovered(false);
      }}
      onClick={() => {
        if (expandMode === 'click' && imgSrc) {
          setExpanded((v) => !v);
        }
      }}
    >
      {imgSrc ? (
        <>
          {/* Image */}
          <img
            src={imgSrc}
            alt={alt}
            style={imgStyle}
            loading="eager"
            onError={handleError}
            onLoad={() => {
              imageDebug.log(`✅ 图片渲染成功: ${sourceType} (${(imgSrc?.length || 0)/1024 | 0}KB)`);
              setLoaded(true);
            }}
          />
          {/* Simple placeholder while loading image bytes */}
          {!loaded && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "repeating-linear-gradient(45deg, #1f2937, #1f2937 10px, #111827 10px, #111827 20px)",
              }}
            />
          )}
        </>
      ) : (
        // Fallback placeholder when no image or failed to load
        <div
          style={{
            width: "100%",
            height: collapsedH ?? height,
            background:
              "repeating-linear-gradient(45deg, #1f2937, #1f2937 10px, #111827 10px, #111827 20px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#9ca3af",
            fontSize: 12,
          }}
        >
          无截图
        </div>
      )}
    </div>
  );
};

export default Thumbnail;
