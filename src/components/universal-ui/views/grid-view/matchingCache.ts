// Lightweight matching cache for Grid Inspector
// Keeps latest matching selection (strategy + fields) in-memory and sessionStorage

export interface LatestMatchingCache {
  strategy: string;
  fields: string[];
}

const KEY = 'grid.latestMatching.v1';

export function saveLatestMatching(m: LatestMatchingCache | null) {
  try {
    (window as any).__latestMatching__ = m || undefined;
    if (m && m.strategy && Array.isArray(m.fields)) {
      sessionStorage.setItem(KEY, JSON.stringify(m));
    } else {
      sessionStorage.removeItem(KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function loadLatestMatching(): LatestMatchingCache | null {
  try {
    const inWin = (window as any).__latestMatching__ as LatestMatchingCache | undefined;
    if (inWin && inWin.strategy && Array.isArray(inWin.fields)) return inWin;
  } catch { /* ignore */ }
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.strategy && Array.isArray(parsed.fields)) return parsed;
  } catch { /* ignore */ }
  return null;
}
