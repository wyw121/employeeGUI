import { useState, useMemo, useCallback } from 'react';
import type { UIElement } from '../../../../api/universalUIAPI';

export interface PageFinderSearchResult {
  searchText: string;
  setSearchText: (v: string) => void;
  showOnlyClickable: boolean;
  setShowOnlyClickable: (v: boolean) => void;
  filteredElements: UIElement[];
  stats: { total: number; clickable: number; withText: number };
  filterFn: (el: UIElement) => boolean;
  reset: () => void;
}

/**
 * 提供 UniversalPageFinder 的搜索/过滤/统计逻辑
 * 无副作用：只依赖传入元素数组，易于单测与复用
 */
export function usePageFinderSearch(uiElements: UIElement[]): PageFinderSearchResult {
  const [searchText, setSearchText] = useState('');
  const [showOnlyClickable, setShowOnlyClickable] = useState(false);

  const filterFn = useCallback((element: UIElement) => {
    const lower = searchText.toLowerCase();
    const matchesSearch =
      lower === '' ||
      element.text.toLowerCase().includes(lower) ||
      (element.content_desc && element.content_desc.toLowerCase().includes(lower));
    const matchesClickable = !showOnlyClickable || !!element.is_clickable;
    return matchesSearch && matchesClickable;
  }, [searchText, showOnlyClickable]);

  const filteredElements = useMemo(() => uiElements.filter(filterFn), [uiElements, filterFn]);

  const stats = useMemo(() => ({
    total: uiElements.length,
    clickable: uiElements.filter(e => e.is_clickable).length,
    withText: uiElements.filter(e => e.text && e.text.trim() !== '').length
  }), [uiElements]);

  const reset = useCallback(() => {
    setSearchText('');
    setShowOnlyClickable(false);
  }, []);

  return { searchText, setSearchText, showOnlyClickable, setShowOnlyClickable, filteredElements, stats, filterFn, reset };
}

export default usePageFinderSearch;
