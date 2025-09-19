// 拖拽排序相关的工具函数

import type { DraggableItem, DroppableArea, DragResult } from '../types';

/**
 * 重新排列数组项目
 */
export const reorderArray = <T>(
  list: T[],
  startIndex: number,
  endIndex: number
): T[] => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

/**
 * 在不同容器间移动项目
 */
export const moveItemBetweenContainers = (
  items: DraggableItem[],
  source: { droppableId: string; index: number },
  destination: { droppableId: string; index: number }
): DraggableItem[] => {
  // 找到源项目
  const sourceItems = items.filter(item => 
    item.containerId === source.droppableId || 
    (source.droppableId === 'default' && !item.containerId)
  );
  
  const destinationItems = items.filter(item => 
    item.containerId === destination.droppableId || 
    (destination.droppableId === 'default' && !item.containerId)
  );

  const [movedItem] = sourceItems.splice(source.index, 1);
  
  // 更新项目的容器ID
  movedItem.containerId = destination.droppableId === 'default' ? undefined : destination.droppableId;
  
  // 插入到目标位置
  destinationItems.splice(destination.index, 0, movedItem);
  
  // 重新构建完整列表
  const otherItems = items.filter(item => 
    item.containerId !== source.droppableId && 
    item.containerId !== destination.droppableId &&
    !(source.droppableId === 'default' && !item.containerId) &&
    !(destination.droppableId === 'default' && !item.containerId)
  );

  return [...otherItems, ...sourceItems, ...destinationItems];
};

/**
 * 验证拖拽操作是否有效
 */
export const validateDragOperation = (
  items: DraggableItem[],
  result: DragResult,
  rules?: {
    allowCrossContainer?: boolean;
    allowedContainers?: string[];
    blockedContainers?: string[];
    customValidator?: (item: DraggableItem, destination: string) => boolean;
  }
): boolean => {
  const { source, destination, draggableId } = result;
  
  if (!destination) {
    return false;
  }

  const draggedItem = items.find(item => item.id.toString() === draggableId);
  if (!draggedItem) {
    return false;
  }

  // 检查是否允许跨容器拖拽
  if (!rules?.allowCrossContainer && source.droppableId !== destination.droppableId) {
    return false;
  }

  // 检查允许的容器
  if (rules?.allowedContainers && !rules.allowedContainers.includes(destination.droppableId)) {
    return false;
  }

  // 检查被阻止的容器
  if (rules?.blockedContainers && rules.blockedContainers.includes(destination.droppableId)) {
    return false;
  }

  // 自定义验证器
  if (rules?.customValidator && !rules.customValidator(draggedItem, destination.droppableId)) {
    return false;
  }

  return true;
};

/**
 * 计算拖拽项目的新位置
 */
export const calculateNewPosition = (
  items: DraggableItem[],
  dragResult: DragResult
): { newItems: DraggableItem[]; movedItem: DraggableItem } => {
  const { source, destination } = dragResult;
  
  if (!destination) {
    return { newItems: items, movedItem: items[source.index] };
  }

  let newItems: DraggableItem[];
  let movedItem: DraggableItem;

  if (source.droppableId === destination.droppableId) {
    // 同一容器内重新排序
    const containerItems = items.filter(item => 
      item.containerId === source.droppableId || 
      (source.droppableId === 'default' && !item.containerId)
    );
    
    const reorderedItems = reorderArray(containerItems, source.index, destination.index);
    movedItem = reorderedItems[destination.index];
    
    // 合并其他容器的项目
    const otherItems = items.filter(item => 
      item.containerId !== source.droppableId &&
      !(source.droppableId === 'default' && !item.containerId)
    );
    
    newItems = [...otherItems, ...reorderedItems];
  } else {
    // 跨容器移动
    newItems = moveItemBetweenContainers(items, source, destination);
    movedItem = newItems.find(item => item.id.toString() === dragResult.draggableId)!;
  }

  return { newItems, movedItem };
};

/**
 * 为项目分配默认位置
 */
export const assignDefaultPosition = (
  item: DraggableItem,
  containerId?: string,
  index?: number
): DraggableItem => {
  return {
    ...item,
    containerId: containerId === 'default' ? undefined : containerId,
    position: index !== undefined ? index : item.position || 0
  };
};

/**
 * 获取容器中的所有项目
 */
export const getItemsInContainer = (
  items: DraggableItem[],
  containerId: string
): DraggableItem[] => {
  return items.filter(item => 
    item.containerId === containerId || 
    (containerId === 'default' && !item.containerId)
  ).sort((a, b) => (a.position || 0) - (b.position || 0));
};

/**
 * 更新项目位置索引
 */
export const updateItemPositions = (items: DraggableItem[]): DraggableItem[] => {
  // 按容器分组
  const containerGroups: { [key: string]: DraggableItem[] } = {};
  
  items.forEach(item => {
    const containerId = item.containerId || 'default';
    if (!containerGroups[containerId]) {
      containerGroups[containerId] = [];
    }
    containerGroups[containerId].push(item);
  });

  // 为每个容器的项目重新编号
  const updatedItems: DraggableItem[] = [];
  
  Object.entries(containerGroups).forEach(([containerId, containerItems]) => {
    containerItems.sort((a, b) => (a.position || 0) - (b.position || 0));
    
    containerItems.forEach((item, index) => {
      updatedItems.push({
        ...item,
        position: index,
        containerId: containerId === 'default' ? undefined : containerId
      });
    });
  });

  return updatedItems;
};