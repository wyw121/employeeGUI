// 安全的 localStorage 读写封装（仅在浏览器环境可用）

export const DND_UI_CONFIG_STORAGE_KEY = 'app.dndUiConfig.v1';

export interface PersistableConfig {
  useGhostOverlay?: boolean;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadDnDUIConfig(): PersistableConfig | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(DND_UI_CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as PersistableConfig;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveDnDUIConfig(config: PersistableConfig): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(DND_UI_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // 忽略写入失败（隐私模式/配额等）
  }
}
