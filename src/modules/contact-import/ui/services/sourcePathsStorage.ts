// 负责持久化联系人导入的“源文件夹路径”列表（使用 localStorage）

const STORAGE_KEY = 'contactImport.sourceFolders';

export function loadSourceFolders(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr.filter(Boolean) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveSourceFolders(folders: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
  } catch {
    // 忽略写入错误
  }
}

export function normalizeFolderPath(path: string): string {
  // 简单归一化：去除末尾的分隔符（Windows/Unix）
  return path.replace(/[\\/]+$/, '');
}
