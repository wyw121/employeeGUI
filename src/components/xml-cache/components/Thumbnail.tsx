import React from "react";

export interface ThumbnailProps {
  src?: string;
  alt?: string;
  width?: number;
  height?: number | string;
  borderRadius?: number;
  fullWidth?: boolean; // if true, use 100% width and keep aspect by height prop
  absolutePathForFallback?: string; // use when needing backend data-url fallback
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
}) => {
  const [imgSrc, setImgSrc] = React.useState<string | undefined>(src);
  const [triedFallback, setTriedFallback] = React.useState(false);

  React.useEffect(() => setImgSrc(src), [src]);

  const handleError = React.useCallback(async () => {
    // Only try once to avoid loops
    if (triedFallback || !absolutePathForFallback) {
      setImgSrc(undefined);
      return;
    }
    setTriedFallback(true);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const dataUrl: string = await invoke("read_file_as_data_url", {
        path: absolutePathForFallback,
      });
      if (dataUrl && typeof dataUrl === "string" && dataUrl.startsWith("data:")) {
        setImgSrc(dataUrl);
        return;
      }
    } catch (_) {
      // ignore, will show placeholder
    }
    setImgSrc(undefined);
  }, [absolutePathForFallback, triedFallback]);

  return (
    <div
      style={{
        width: fullWidth ? "100%" : width,
  height,
        borderRadius,
        overflow: "hidden",
        backgroundColor: "#111827",
        position: "relative",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid #1f2937",
      }}
    >
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={alt}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          loading="lazy"
          onError={handleError}
        />
      ) : (
        // Fallback placeholder when no image or failed to load
        <div
          style={{
            width: "100%",
            height: "100%",
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
