import { BridgeUIElement, VisualUIElement } from '../types/visual-types';

// 解析 bounds 字符串 -> 坐标与尺寸
export function parseBounds(bounds: string): { x: number; y: number; width: number; height: number } {
  const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) return { x: 0, y: 0, width: 0, height: 0 };
  const [, x1, y1, x2, y2] = match.map(Number);
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

// VisualUIElement -> 旧 UIElement 桥接（UI 使用结构）
export function convertVisualToUIElement(element: VisualUIElement, selectedId?: string): BridgeUIElement {
  const position = element.position || { x: 0, y: 0, width: 100, height: 50 };
  return {
    id: element.id,
    element_type: element.type || '',
    text: element.text || '',
    bounds: {
      left: position.x,
      top: position.y,
      right: position.x + position.width,
      bottom: position.y + position.height,
    },
    xpath: element.id,
    resource_id: '',
    class_name: '',
    is_clickable: !!element.clickable,
    is_scrollable: false,
    is_enabled: true,
    is_focused: false,
    checkable: false,
    checked: false,
    selected: element.id === selectedId,
    password: false,
    content_desc: '',
  };
}
