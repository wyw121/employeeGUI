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
        const dataUrl = await loadDataUrlWithCache(absolutePathForFallback);
        if (!cancelled && dataUrl) {
          setImgSrc(dataUrl);
          setSourceType('data');
          return;
        }
        // fallback to asset if available
        if (!cancelled && src) {
          setImgSrc(src);
          setSourceType('asset');
        }
      } else if (src) {
        setImgSrc(src);
        setSourceType('asset');
      } else {
        // no image available
        setImgSrc(undefined);
        setSourceType('none');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [absolutePathForFallback, src]);

  const handleError = React.useCallback(async () => {
    // Only try once to avoid loops
    if (triedFallback || !absolutePathForFallback) {
      setImgSrc(undefined);
      return;
    }
    setTriedFallback(true);
    // Check cache first
    const cached = getCachedDataUrl(absolutePathForFallback);
    if (cached) {
      setImgSrc(cached);
      setSourceType("data");
      return;
    }
    const dataUrl = await loadDataUrlWithCache(absolutePathForFallback);
    if (dataUrl) {
      setImgSrc(dataUrl);
      setSourceType("data");
      return;
    }
    setImgSrc(undefined);
    setSourceType("none");
  }, [absolutePathForFallback, triedFallback]);

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
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
            loading="lazy"
            onError={handleError}
            onLoad={() => setLoaded(true)}
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
