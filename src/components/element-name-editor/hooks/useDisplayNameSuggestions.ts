import { useMemo } from 'react';
import { UIElement } from '../../../modules/ElementNameMapper';

export const useDisplayNameSuggestions = (element: UIElement | null) => {
  return useMemo(() => {
    if (!element) return [] as string[];
    const candidates: (string | null)[] = [
      element.text && element.text.trim() ? `${element.text}按钮` : null,
      element.resource_id ? element.resource_id.split('/').pop()?.replace('_', ' ') || null : null,
      element.content_desc || null
    ];
    return candidates.filter(Boolean).slice(0, 3) as string[];
  }, [element]);
};

export default useDisplayNameSuggestions;
