// In-memory LRU cache for image data URLs to avoid repeated backend reads (keyed by absolute path)
// Simple LRU via Map insertion order: on get/set we re-insert to mark as most-recently-used

let capacity = 200;
const lru = new Map<string, string>();

function touch(key: string, value: string) {
  if (lru.has(key)) lru.delete(key);
  lru.set(key, value);
  if (lru.size > capacity) {
    const oldestKey = lru.keys().next().value as string | undefined;
    if (oldestKey) lru.delete(oldestKey);
  }
}

export function setImageCacheCapacity(max: number) {
  if (Number.isFinite(max) && max > 0) {
    capacity = Math.floor(max);
    // Trim if needed
    while (lru.size > capacity) {
      const oldestKey = lru.keys().next().value as string | undefined;
      if (!oldestKey) break;
      lru.delete(oldestKey);
    }
  }
}

export function getCachedDataUrl(path: string | undefined | null): string | undefined {
  if (!path) return undefined;
  const hit = lru.get(path);
  if (hit) {
    touch(path, hit);
    return hit;
  }
  return undefined;
}

export function setCachedDataUrl(path: string | undefined | null, dataUrl: string): void {
  if (!path) return;
  touch(path, dataUrl);
}

export async function loadDataUrlWithCache(path: string): Promise<string | undefined> {
  const hit = lru.get(path);
  if (hit) {
    touch(path, hit);
    return hit;
  }
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const dataUrl: string = await invoke("read_file_as_data_url", { path });
    if (typeof dataUrl === "string" && dataUrl.startsWith("data:")) {
      touch(path, dataUrl);
      return dataUrl;
    }
  } catch {
    // ignore errors, return undefined
  }
  return undefined;
}

export function clearImageCache() {
  lru.clear();
}

export default {
  getCachedDataUrl,
  setCachedDataUrl,
  loadDataUrlWithCache,
  clearImageCache,
  setImageCacheCapacity,
};
