import { useState, useMemo, useCallback } from 'react';
import type { VisualUIElement, VisualElementCategory } from '../../xml-parser';

export interface PageFinderCategoriesResult {
  selectedCategory: string;
  setSelectedCategory: (c: string) => void;
  categoryStats: Record<string, number>;
  filterByCategory: (els: VisualUIElement[]) => VisualUIElement[];
  resetCategory: () => void;
}

/**
 * 管理可视化分类筛选（与搜索逻辑解耦，可串联）
 */
export function usePageFinderCategories(categories: VisualElementCategory[]): PageFinderCategoriesResult {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = { all: 0 };
    categories.forEach(cat => {
      stats[cat.name] = cat.elements.length;
      stats.all += cat.elements.length;
    });
    return stats;
  }, [categories]);

  const filterByCategory = useCallback((els: VisualUIElement[]) => {
    if (selectedCategory === 'all') return els;
    return els.filter(e => e.category === selectedCategory || e.category === undefined);
  }, [selectedCategory]);

  const resetCategory = useCallback(() => setSelectedCategory('all'), []);

  return { selectedCategory, setSelectedCategory, categoryStats, filterByCategory, resetCategory };
}

export default usePageFinderCategories;
