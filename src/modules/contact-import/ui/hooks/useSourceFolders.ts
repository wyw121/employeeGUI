import { useCallback, useMemo, useState } from 'react';
import { loadSourceFolders, saveSourceFolders, normalizeFolderPath } from '../services/sourcePathsStorage';

export function useSourceFolders() {
  const [folders, setFolders] = useState<string[]>(() => loadSourceFolders());

  const addFolder = useCallback((dir: string) => {
    const norm = normalizeFolderPath(dir);
    setFolders(prev => {
      if (prev.includes(norm)) return prev; // 去重
      const next = [...prev, norm];
      saveSourceFolders(next);
      return next;
    });
  }, []);

  const removeFolder = useCallback((dir: string) => {
    const norm = normalizeFolderPath(dir);
    setFolders(prev => {
      const next = prev.filter(p => p !== norm);
      saveSourceFolders(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setFolders(() => {
      saveSourceFolders([]);
      return [];
    });
  }, []);

  const hasItems = useMemo(() => folders.length > 0, [folders]);

  return { folders, addFolder, removeFolder, clearAll, hasItems };
}

export default useSourceFolders;
