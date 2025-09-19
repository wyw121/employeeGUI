// 拖拽排序模块 - 类型定义

import { ExtendedSmartScriptStep } from '../../loop-control/types';

/**
 * 拖拽事件类型
 */
export enum DragEventType {
  /** 开始拖拽 */
  DRAG_START = 'drag_start',
  /** 拖拽中 */
  DRAG_OVER = 'drag_over', 
  /** 拖拽结束 */
  DRAG_END = 'drag_end',
  /** 放置 */
  DROP = 'drop'
}

/**
 * 拖拽结果
 */
export interface DragResult {
  /** 拖拽项目ID */
  draggableId: string;
  /** 源位置信息 */
  source: {
    droppableId: string;
    index: number;
  };
  /** 目标位置信息 */
  destination: {
    droppableId: string;
    index: number;
  } | null;
}

/**
 * 可拖拽项目接口
 */
export interface DraggableItem {
  /** 项目唯一ID */
  id: string;
  /** 项目类型 */
  type: string;
  /** 所属容器ID */
  containerId?: string;
  /** 项目在容器中的位置索引 */
  position?: number;
  /** 项目数据 */
  data?: any;
  /** 是否可拖拽 */
  draggable?: boolean;
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 放置区域接口
 */
export interface DroppableArea {
  /** 区域唯一ID */
  id: string;
  /** 区域标题 */
  title: string;
  /** 区域类型 */
  type: 'default' | 'loop' | 'custom';
  /** 空状态提示文本 */
  emptyText?: string;
  /** 背景颜色 */
  backgroundColor?: string;
  /** 悬浮时背景颜色 */
  hoverBackgroundColor?: string;
  /** 自定义样式类名 */
  className?: string;
  /** 是否接受拖拽 */
  accepts?: string[];
  /** 最大容量 */
  maxItems?: number;
  /** 是否禁用放置 */
  disabled?: boolean;
}

/**
 * 拖拽配置
 */
export interface DragConfig {
  /** 是否启用拖拽 */
  enabled: boolean;
  /** 拖拽方向 */
  direction: 'vertical' | 'horizontal' | 'both';
  /** 是否允许跨容器拖拽 */
  allowCrossContainer: boolean;
  /** 是否允许拖入循环体 */
  allowIntoLoop: boolean;
  /** 是否允许拖出循环体 */
  allowOutOfLoop: boolean;
  /** 拖拽动画时长 */
  animationDuration: number;
}

/**
 * 步骤层次结构
 */
export interface StepHierarchy {
  /** 主步骤列表 */
  mainSteps: ExtendedSmartScriptStep[];
  /** 循环结构映射 */
  loops: Map<string, {
    startStep: ExtendedSmartScriptStep;
    endStep: ExtendedSmartScriptStep;
    innerSteps: ExtendedSmartScriptStep[];
    level: number;
  }>;
}

/**
 * 拖拽状态
 */
export interface DragState {
  /** 当前拖拽的步骤ID */
  draggingStepId?: string;
  /** 拖拽的步骤 */
  draggingStep?: ExtendedSmartScriptStep;
  /** 源位置 */
  sourcePosition?: {
    container: string;
    index: number;
    loopId?: string;
  };
  /** 预览目标位置 */
  previewPosition?: {
    container: string;
    index: number;
    loopId?: string;
  };
  /** 是否正在拖拽 */
  isDragging: boolean;
}

/**
 * 拖拽验证规则
 */
export interface DragValidationRules {
  /** 验证函数 */
  validate: (result: DragResult, steps: ExtendedSmartScriptStep[]) => boolean;
  /** 错误消息 */
  errorMessage: string;
  /** 规则类型 */
  type: 'prevent_loop_nesting' | 'prevent_orphan_loop' | 'custom';
}

/**
 * 拖拽操作历史
 */
export interface DragHistory {
  /** 操作ID */
  id: string;
  /** 操作时间 */
  timestamp: number;
  /** 操作类型 */
  action: 'move' | 'insert' | 'remove';
  /** 操作前的步骤列表 */
  beforeSteps: ExtendedSmartScriptStep[];
  /** 操作后的步骤列表 */
  afterSteps: ExtendedSmartScriptStep[];
  /** 操作描述 */
  description: string;
}