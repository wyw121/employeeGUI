// Small utility to convert absolute file paths to a Tauri asset URL safely across platforms.
// - Strips Windows extended-length prefix (\\?\)
// - Normalizes backslashes to forward slashes
// - Uses convertFileSrc to produce asset.localhost URL handled by WebView
import { convertFileSrc } from "@tauri-apps/api/core";

/**
 * Remove Windows extended-length path prefix \\?\ (and variants), no-op on other platforms.
 */
export function stripExtendedPrefix(p: string): string {
  // \\?\D:\path or //?/D:/path
  return p.replace(/^\\\\\?\\/i, "").replace(/^\/\/\?\//, "");
}

/**
 * Normalize path separators to forward slash for URL friendliness.
 */
export function toForwardSlashes(p: string): string {
  return p.replace(/\\/g, "/");
}

/**
 * Convert an absolute file system path to a WebView-loadable asset URL.
 * Returns undefined if the input is falsy.
 */
export function toAssetUrl(absPath?: string | null): string | undefined {
  if (!absPath) return undefined;
  try {
    let s = stripExtendedPrefix(absPath);
    s = toForwardSlashes(s);
    return convertFileSrc(s);
  } catch {
    return undefined;
  }
}

export default toAssetUrl;

