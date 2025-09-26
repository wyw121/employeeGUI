// 抽离自 ElementNameEditor.tsx (重新定位在目录根，避免深层相对路径问题)
import type { UIElement as InternalUIElement } from '../../modules/ElementNameMapper';
import type { UIElement as UniversalUIElement } from '../../api/universalUIAPI';

export const adaptElementToUniversalUIType = (element: InternalUIElement): UniversalUIElement => {
  return {
    id: element.id || element.resource_id || element.text || 'unknown',
    text: element.text || '',
    element_type: element.element_type || '',
    class_name: element.element_type || '',
    resource_id: element.resource_id || '',
    content_desc: element.content_desc || '',
    bounds: element.bounds || { left: 0, top: 0, right: 0, bottom: 0 },
    xpath: '',
    is_clickable: element.clickable || false,
    is_scrollable: false,
    is_enabled: true,
    is_focused: false,
    checkable: element.clickable || false,
    checked: false,
    selected: false,
    password: false
  } as UniversalUIElement;
};

export default adaptElementToUniversalUIType;
