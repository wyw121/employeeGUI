import { describe, it, expect, beforeEach } from 'vitest';
import {
  setImageCacheCapacity,
  setCachedDataUrl,
  getCachedDataUrl,
  clearImageCache,
} from '../utils/imageCache';

describe('imageCache LRU', () => {
  beforeEach(() => {
    clearImageCache();
    setImageCacheCapacity(2);
  });

  it('evicts least-recently-used item when over capacity', () => {
    setCachedDataUrl('A', 'data:A');
    setCachedDataUrl('B', 'data:B');
    // Touch A to make it MRU
    getCachedDataUrl('A');
    // Insert C, should evict B
    setCachedDataUrl('C', 'data:C');

    expect(getCachedDataUrl('A')).toBe('data:A');
    expect(getCachedDataUrl('B')).toBeUndefined();
    expect(getCachedDataUrl('C')).toBe('data:C');
  });
});
