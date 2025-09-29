import React from "react";
import { getCachedDataUrl, loadDataUrlWithCache } from "../utils/imageCache";

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
}) => {
  const [imgSrc, setImgSrc] = React.useState<string | undefined>(undefined);
  const [triedFallback, setTriedFallback] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const hoverTimer = React.useRef<number | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [sourceType, setSourceType] = React.useState<'asset' | 'data' | 'none'>('none');
  const [expanded, setExpanded] = React.useState(false);

  // Decide image source once per input change (best practice on Windows):
  // - If absolutePathForFallback exists: try backend data URL first; if fail, fallback to asset src
  // - Else: use asset src when provided
  React.useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setTriedFallback(false);
    setSourceType('none');
    setImgSrc(undefined);
    (async () => {
      if (absolutePathForFallback) {
        console.log(`🔍 尝试加载图片: ${absolutePathForFallback}`);
        const dataUrl = await loadDataUrlWithCache(absolutePathForFallback);
        if (!cancelled && dataUrl) {
          console.log(`📊 设置 data URL 源: ${absolutePathForFallback} (长度: ${dataUrl.length}) - 使用 loading="eager"`);
          setImgSrc(dataUrl);
          setSourceType('data');
          return;
        }
        // fallback to asset if available
        if (!cancelled && src) {
          console.log(`📊 回退到资源源: ${src}`);
          setImgSrc(src);
          setSourceType('asset');
        }
      } else if (src) {
        console.log(`📊 使用资源源: ${src}`);
        setImgSrc(src);
        setSourceType('asset');
      } else {
        // no image available
        console.log(`📊 无图片源可用`);
        setImgSrc(undefined);
        setSourceType('none');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [absolutePathForFallback, src]);

  const handleError = React.useCallback(async (error: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.log(`🔴 图片加载错误: ${absolutePathForFallback}`, {
      imgSrc,
      sourceType,
      triedFallback,
      error: error.currentTarget.src,
    });
    
    // Only try once to avoid loops
    if (triedFallback || !absolutePathForFallback) {
      console.log(`🔴 不再重试: triedFallback=${triedFallback}, absolutePathForFallback=${!!absolutePathForFallback}`);
      setImgSrc(undefined);
      return;
    }
    setTriedFallback(true);
    // Check cache first
    const cached = getCachedDataUrl(absolutePathForFallback);
    if (cached) {
      console.log(`🔄 使用缓存重试: ${absolutePathForFallback} (长度: ${cached.length})`);
      setImgSrc(cached);
      setSourceType("data");
      return;
    }
    console.log(`🔄 重新加载图片: ${absolutePathForFallback}`);
    const dataUrl = await loadDataUrlWithCache(absolutePathForFallback);
    if (dataUrl) {
      console.log(`🔄 重新加载成功: ${absolutePathForFallback} (长度: ${dataUrl.length})`);
      setImgSrc(dataUrl);
      setSourceType("data");
      return;
    }
    console.log(`🔴 重新加载失败: ${absolutePathForFallback}`);
    setImgSrc(undefined);
    setSourceType("none");
  }, [absolutePathForFallback, triedFallback, imgSrc, sourceType]);

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
              console.log(`✅ 图片加载成功: ${absolutePathForFallback}`, {
                imgSrc: imgSrc?.substring(0, 50) + '...',
                sourceType,
                loadingAttribute: 'eager', // 确认使用 eager 加载
                dataUrlLength: imgSrc?.length,
              });
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
