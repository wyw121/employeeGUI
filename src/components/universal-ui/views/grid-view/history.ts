const KEY_SEARCH = 'gridView.searchHistory.v1';
const KEY_XPATH = 'gridView.xpathHistory.v1';
const KEY_FAV_SEARCH = 'gridView.favSearch.v1';
const KEY_FAV_XPATH = 'gridView.favXPath.v1';

const MAX_ITEMS = 20;

function readArray(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr.filter((x) => typeof x === 'string') as string[]) : [];
  } catch {
    return [];
  }
}

function writeArray(key: string, arr: string[]) {
  try { localStorage.setItem(key, JSON.stringify(arr.slice(0, MAX_ITEMS))); } catch { /* ignore */ }
}

export function getSearchHistory(): string[] { return readArray(KEY_SEARCH); }
export function addSearchHistory(term: string) {
  const t = (term || '').trim(); if (!t) return;
  const cur = readArray(KEY_SEARCH).filter(x => x !== t);
  cur.unshift(t);
  writeArray(KEY_SEARCH, cur);
}
export function clearSearchHistory() { writeArray(KEY_SEARCH, []); }

export function getXPathHistory(): string[] { return readArray(KEY_XPATH); }
export function addXPathHistory(xp: string) {
  const x = (xp || '').trim(); if (!x) return;
  const cur = readArray(KEY_XPATH).filter(v => v !== x);
  cur.unshift(x);
  writeArray(KEY_XPATH, cur);
}
export function clearXPathHistory() { writeArray(KEY_XPATH, []); }

function readSet(key: string): Set<string> { return new Set(readArray(key)); }
function writeSet(key: string, set: Set<string>) { writeArray(key, Array.from(set)); }

export function getFavoriteSearches(): string[] { return Array.from(readSet(KEY_FAV_SEARCH)); }
export function toggleFavoriteSearch(term: string): boolean {
  const t = (term || '').trim(); if (!t) return false;
  const s = readSet(KEY_FAV_SEARCH);
  if (s.has(t)) s.delete(t); else s.add(t);
  writeSet(KEY_FAV_SEARCH, s);
  return s.has(t);
}

export function getFavoriteXPaths(): string[] { return Array.from(readSet(KEY_FAV_XPATH)); }
export function toggleFavoriteXPath(xp: string): boolean {
  const x = (xp || '').trim(); if (!x) return false;
  const s = readSet(KEY_FAV_XPATH);
  if (s.has(x)) s.delete(x); else s.add(x);
  writeSet(KEY_FAV_XPATH, s);
  return s.has(x);
}
