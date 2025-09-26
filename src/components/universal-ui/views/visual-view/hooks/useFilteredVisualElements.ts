import { useMemo } from 'react';
import type { VisualUIElement } from '../../../types';

interface Params {
  elements: VisualUIElement[];
  searchText: string;
  selectedCategory: string;
  showOnlyClickable: boolean;
  hideCompletely: boolean;
  selectionManager: any;
}

export function useFilteredVisualElements({ elements, searchText, selectedCategory, showOnlyClickable, hideCompletely, selectionManager }: Params) {
  return useMemo(() => {
    return elements.filter(element => {
      if (hideCompletely) {
        const isHidden = selectionManager.hiddenElements.some((h: any) => h.id === element.id);
        if (isHidden) return false;
      }
      const kw = searchText.trim().toLowerCase();
      const matchesSearch = kw === '' || element.userFriendlyName.toLowerCase().includes(kw) || element.description.toLowerCase().includes(kw);
      const matchesCategory = selectedCategory === 'all' || element.category === selectedCategory;
      const matchesClickable = !showOnlyClickable || element.clickable;
      return matchesSearch && matchesCategory && matchesClickable;
    });
  }, [elements, searchText, selectedCategory, showOnlyClickable, hideCompletely, selectionManager.hiddenElements]);
}
