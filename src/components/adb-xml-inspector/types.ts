/**
 * ADB XML检查器类型定义
 * 定义UI层级解析和可视化相关的数据结构
 */

/** UI节点接口 */
export interface UiNode {
  /** DOM 节点名称：hierarchy 或 node */
  tag: string;
  /** UiAutomator 属性字典 */
  attrs: Record<string, string>;
  /** 子节点 */
  children: UiNode[];
  /** 父节点（运行时指针，便于生成 XPath） */
  parent?: UiNode | null;
}

/** 元素边界坐标 */
export interface ElementBounds {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  w: number;
  h: number;
}

/** 屏幕尺寸 */
export interface ScreenDimension {
  width: number;
  height: number;
}

/** 节点详情展示配置 */
export interface NodeDisplayConfig {
  mainFields: string[];
  hiddenFields?: string[];
}

/** 组件属性接口 */
export interface AdbXmlInspectorProps {
  /** 初始XML内容 */
  initialXml?: string;
  /** 高度限制 */
  height?: number;
  /** 是否显示底部提示 */
  showTips?: boolean;
  /** 节点选择回调 */
  onNodeSelected?: (node: UiNode, xpath: string) => void;
  /** 样式类名 */
  className?: string;
}