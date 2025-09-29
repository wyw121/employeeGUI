// In-memory LRU cache for image data URLs to avoid repeated backend reads (keyed by absolute path)
// Simple LRU via Map insertion order: on get/set we re-insert to mark as most-recently-used

import { cacheDebug, performance } from '../../../utils/debugUtils';

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
    cacheDebug.verbose(`🎯 缓存命中: ${path}`);
    return hit;
  }
  return undefined;
}

export function setCachedDataUrl(path: string | undefined | null, dataUrl: string): void {
  if (!path) return;
  touch(path, dataUrl);
}

export async function loadDataUrlWithCache(path: string): Promise<string | undefined> {
  // 检查缓存
  const hit = lru.get(path);
  if (hit) {
    touch(path, hit);
    cacheDebug.verbose(`🎯 缓存命中图片: ${path} (${(hit.length/1024).toFixed(1)}KB)`);
    return hit;
  }
  
  // 性能监控
  const perfKey = `image-load-${Date.now()}`;
  performance.mark(`${perfKey}-start`);
  
  try {
    cacheDebug.log(`📡 从后端加载图片: ${path}`);
    const { invoke } = await import("@tauri-apps/api/core");
    const dataUrl: string = await invoke("read_file_as_data_url", { path });
    
    performance.mark(`${perfKey}-end`);
    performance.measure(`图片加载-${path.split(/[\\/]/).pop()}`, `${perfKey}-start`, `${perfKey}-end`);
    
    if (typeof dataUrl === "string" && dataUrl.startsWith("data:")) {
      cacheDebug.log(`✅ 图片加载成功: ${path} (${(dataUrl.length/1024).toFixed(1)}KB)`);
      touch(path, dataUrl);
      return dataUrl;
    } else {
      cacheDebug.warn(`⚠️ 后端返回无效 data URL: ${path}`, dataUrl);
    }
  } catch (error) {
    cacheDebug.error(`❌ 图片加载失败: ${path}`, error);
    performance.mark(`${perfKey}-error`);
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
