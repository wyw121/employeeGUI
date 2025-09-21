/**
 * Universal UI 通用类型定义
 * 统一的UI元素类型接口，用于所有universal-ui组件
 */

// 通用UI元素接口（从VisualElementView中统一）
export interface VisualUIElement {
  id: string;
  text: string;
  description: string;
  type: string;
  category: string;
  position: { x: number; y: number; width: number; height: number };
  clickable: boolean;
  importance: 'high' | 'medium' | 'low';
  userFriendlyName: string;
}

// 元素分类接口
export interface VisualElementCategory {
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  elements: VisualUIElement[];
}

// 统计信息接口
export interface ElementStats {
  total: number;
  interactive: number;
  types: number;
}

// 视图模式类型
export type ViewMode = 'visual' | 'list' | 'tree';

// 通用属性接口
export interface UniversalUIProps {
  elements?: VisualUIElement[];
  onElementSelect?: (element: VisualUIElement) => void;
  selectedElementId?: string;
  xmlContent?: string;
}

// 基础视图属性接口（用于传统UIElement组件）
export interface BaseViewProps {
  elements?: any[]; // 可以是UIElement[]或VisualUIElement[]
  onElementSelect?: (element: any) => void;
  selectedElementId?: string;
}