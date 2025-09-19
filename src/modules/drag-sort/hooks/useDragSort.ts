// 拖拽排序Hook - 管理拖拽状态和逻辑

import { useState, useCallback, useMemo } from 'react';
import type { DraggableItem, DroppableArea, DragResult, DragConfig } from '../types';
import {
  validateDragOperation,
  calculateNewPosition,
  updateItemPositions,
  getItemsInContainer
} from '../utils/dragUtils';

export interface UseDragSortOptions {
  /** 初始项目列表 */
  initialItems: DraggableItem[];
  /** 拖拽区域配置 */
  droppableAreas: DroppableArea[];
  /** 拖拽配置 */
  config?: Partial<DragConfig>;
  /** 拖拽完成回调 */
  onDragComplete?: (items: DraggableItem[], result: DragResult) => void;
  /** 拖拽验证函数 */
  onValidateDrag?: (item: DraggableItem, targetContainer: string) => boolean;
}

export interface UseDragSortReturn {
  /** 当前项目列表 */
  items: DraggableItem[];
  /** 拖拽配置 */
  config: DragConfig;
  /** 拖拽处理函数 */
  handleDragEnd: (result: DragResult) => void;
  /** 添加项目 */
  addItem: (item: DraggableItem, containerId?: string, position?: number) => void;
  /** 移除项目 */
  removeItem: (itemId: string) => void;
  /** 更新项目 */
  updateItem: (itemId: string, updates: Partial<DraggableItem>) => void;
  /** 移动项目到指定位置 */
  moveItem: (itemId: string, targetContainer: string, targetIndex: number) => void;
  /** 获取容器中的项目 */
  getContainerItems: (containerId: string) => DraggableItem[];
  /** 重置为初始状态 */
  reset: () => void;
  /** 当前是否在拖拽中 */
  isDragging: boolean;
  /** 设置拖拽状态 */
  setDragging: (dragging: boolean) => void;
}

const DEFAULT_CONFIG: DragConfig = {
  enabled: true,
  direction: 'vertical',
  allowCrossContainer: true,
  allowIntoLoop: true,
  allowOutOfLoop: true,
  animationDuration: 200
};

export const useDragSort = (options: UseDragSortOptions): UseDragSortReturn => {
  const {
    initialItems,
    droppableAreas,
    config: userConfig,
    onDragComplete,
    onValidateDrag
  } = options;

  // 合并配置
  const config = useMemo(() => ({
    ...DEFAULT_CONFIG,
    ...userConfig
  }), [userConfig]);

  // 状态管理
  const [items, setItems] = useState<DraggableItem[]>(() => 
    updateItemPositions(initialItems)
  );
  const [isDragging, setDragging] = useState(false);

  // 拖拽结束处理
  const handleDragEnd = useCallback((result: DragResult) => {
    setDragging(false);

    const { source, destination, draggableId } = result;

    // 没有有效的拖放目标
    if (!destination) {
      return;
    }

    // 位置没有变化
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    // 验证拖拽操作
    const draggedItem = items.find(item => item.id === draggableId);
    if (!draggedItem) {
      return;
    }

    // 自定义验证
    if (onValidateDrag && !onValidateDrag(draggedItem, destination.droppableId)) {
      return;
    }

    // 内置验证规则
    const validationRules = {
      allowCrossContainer: config.allowCrossContainer,
      customValidator: (item: DraggableItem, targetContainer: string) => {
        // 循环体相关验证
        const isLoopContainer = droppableAreas.find(area => area.id === targetContainer)?.type === 'loop';
        const isFromLoop = droppableAreas.find(area => area.id === source.droppableId)?.type === 'loop';
        
        if (isLoopContainer && !config.allowIntoLoop) {
          return false;
        }
        
        if (isFromLoop && !config.allowOutOfLoop) {
          return false;
        }
        
        return true;
      }
    };

    if (!validateDragOperation(items, result, validationRules)) {
      return;
    }

    // 计算新位置
    const { newItems } = calculateNewPosition(items, result);
    const finalItems = updateItemPositions(newItems);

    setItems(finalItems);

    // 触发完成回调
    if (onDragComplete) {
      onDragComplete(finalItems, result);
    }
  }, [items, config, droppableAreas, onValidateDrag, onDragComplete]);

  // 添加项目
  const addItem = useCallback((
    item: DraggableItem, 
    containerId = 'default', 
    position?: number
  ) => {
    const containerItems = getItemsInContainer(items, containerId);
    const newPosition = position !== undefined ? position : containerItems.length;
    
    const newItem: DraggableItem = {
      ...item,
      containerId: containerId === 'default' ? undefined : containerId,
      position: newPosition
    };

    const updatedItems = [...items, newItem];
    const finalItems = updateItemPositions(updatedItems);
    setItems(finalItems);
  }, [items]);

  // 移除项目
  const removeItem = useCallback((itemId: string) => {
    const filteredItems = items.filter(item => item.id !== itemId);
    const finalItems = updateItemPositions(filteredItems);
    setItems(finalItems);
  }, [items]);

  // 更新项目
  const updateItem = useCallback((itemId: string, updates: Partial<DraggableItem>) => {
    const updatedItems = items.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    );
    setItems(updatedItems);
  }, [items]);

  // 移动项目到指定位置
  const moveItem = useCallback((itemId: string, targetContainer: string, targetIndex: number) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const currentContainer = item.containerId || 'default';
    const result: DragResult = {
      draggableId: itemId,
      source: {
        droppableId: currentContainer,
        index: getItemsInContainer(items, currentContainer).findIndex(i => i.id === itemId)
      },
      destination: {
        droppableId: targetContainer,
        index: targetIndex
      }
    };

    handleDragEnd(result);
  }, [items, handleDragEnd]);

  // 获取容器中的项目
  const getContainerItems = useCallback((containerId: string): DraggableItem[] => {
    return getItemsInContainer(items, containerId);
  }, [items]);

  // 重置状态
  const reset = useCallback(() => {
    setItems(updateItemPositions(initialItems));
    setDragging(false);
  }, [initialItems]);

  return {
    items,
    config,
    handleDragEnd,
    addItem,
    removeItem,
    updateItem,
    moveItem,
    getContainerItems,
    reset,
    isDragging,
    setDragging
  };
};

export default useDragSort;