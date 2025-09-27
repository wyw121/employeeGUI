// 拖拽排序容器组件 - 使用 @dnd-kit (现代拖拽库，支持 React 19)

import React, { useState, useCallback } from 'react';
import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent, DragOverlay, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Card } from 'antd';

// 导入类型
import { DragResult, DroppableArea, DraggableItem } from '../types';
// 统一 DnD 模块
import DragSensorsProvider from '../../../components/universal-ui/dnd/DragSensorsProvider';
import { SortableItem } from '../../../components/universal-ui/dnd/SortableItem';
import { DragOverlayGhost } from '../../../components/universal-ui/dnd/DragOverlayGhost';
import { useDnDUIConfig } from '../../../components/universal-ui/dnd/DnDUIConfigContext';

export interface DragSortContainerProps {
  /** 可拖拽项目列表 */
  items: DraggableItem[];
  /** 拖拽容器区域配置 */
  droppableAreas: DroppableArea[];
  /** 拖拽结束回调 */
  onDragEnd: (result: DragResult) => void;
  /** 拖拽开始回调 */
  onDragStart?: (item: DraggableItem) => void;
  /** 拖拽中回调 */
  onDragOver?: (result: Partial<DragResult>) => void;
  /** 渲染拖拽项的函数 */
  renderItem: (item: DraggableItem, isDragging?: boolean) => React.ReactNode;
  /** 自定义样式类名 */
  className?: string;
  /** 是否禁用拖拽 */
  disabled?: boolean;
}

// 可排序项组件
// 本地 SortableItem 已弃用，统一使用通用模块的 SortableItem

export const DragSortContainer: React.FC<DragSortContainerProps> = ({
  items,
  droppableAreas,
  onDragEnd,
  onDragStart,
  onDragOver,
  renderItem,
  className,
  disabled = false
}) => {
  const { config } = useDnDUIConfig();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [itemsState, setItemsState] = useState(items);

  // 拖拽开始
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id.toString());

    const draggedItem = itemsState.find(item => item.id === active.id.toString());
    if (draggedItem && onDragStart) {
      onDragStart(draggedItem);
    }
  }, [itemsState, onDragStart]);

  // 拖拽中
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over || !onDragOver) {
      return;
    }

    const draggedItem = itemsState.find(item => item.id === active.id.toString());
    const targetArea = droppableAreas.find(area => area.id === over.id.toString());

    if (draggedItem && targetArea) {
      onDragOver({
        draggableId: active.id.toString(),
        source: {
          droppableId: draggedItem.containerId || 'default',
          index: itemsState.findIndex(item => item.id === active.id.toString())
        },
        destination: {
          droppableId: over.id.toString(),
          index: 0 // 临时索引，在 dragEnd 中计算准确位置
        }
      });
    }
  }, [itemsState, droppableAreas, onDragOver]);

  // 拖拽结束
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) {
      return;
    }

    const draggedItem = itemsState.find(item => item.id === active.id.toString());
    if (!draggedItem) {
      return;
    }

    const activeIndex = itemsState.findIndex(item => item.id === active.id.toString());
    const overIndex = itemsState.findIndex(item => item.id === over.id.toString());

    if (activeIndex !== overIndex) {
      // 同一容器内排序
      const newItems = arrayMove(itemsState, activeIndex, overIndex);
      setItemsState(newItems);

      // 构建拖拽结果
      const result: DragResult = {
        draggableId: active.id.toString(),
        source: {
          droppableId: draggedItem.containerId || 'default',
          index: activeIndex
        },
        destination: {
          droppableId: draggedItem.containerId || 'default',
          index: overIndex
        }
      };

      onDragEnd(result);
    }
  }, [itemsState, onDragEnd]);

  // 获取当前被拖拽的项目
  const activeItem = activeId ? itemsState.find(item => item.id === activeId) : null;

  return (
    <DragSensorsProvider activationDistance={6} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
      <div className={`drag-sort-container ${className || ''}`}>
        {/* 拖拽区域 */}
        {droppableAreas.map((area) => {
          const areaItems = itemsState.filter(item => 
            item.containerId === area.id || (area.id === 'default' && !item.containerId)
          );

          return (
            <Card
              key={area.id}
              title={area.title}
              className={`droppable-area ${area.className || ''}`}
              style={{
                minHeight: 200,
                marginBottom: 16,
                backgroundColor: area.backgroundColor || '#fafafa'
              }}
            >
              <SortableContext 
                items={areaItems.map(item => item.id)}
                strategy={verticalListSortingStrategy}
                disabled={disabled}
              >
                {areaItems.length === 0 ? (
                  <div className="empty-drop-zone" style={{
                    padding: 20,
                    textAlign: 'center',
                    color: '#999',
                    border: '2px dashed #d9d9d9',
                    borderRadius: 4
                  }}>
                    {area.emptyText || '拖拽项目到此处'}
                  </div>
                ) : (
                  areaItems.map((item) => (
                    <SortableItem key={item.id} id={item.id} disabled={disabled}>
                      {renderItem(item, activeId === item.id)}
                    </SortableItem>
                  ))
                )}
              </SortableContext>
            </Card>
          );
        })}
      </div>

      {/* 拖拽预览层 */}
      {config.useGhostOverlay && (
        <DragOverlay>
          {activeItem ? (
            <DragOverlayGhost
              title={(activeItem.data as any)?.actionName || (activeItem.data as any)?.name || activeItem.id}
              subtitle={typeof (activeItem.data as any)?.description === 'string' ? (activeItem.data as any).description : undefined}
              index={activeItem.position}
            />
          ) : null}
        </DragOverlay>
      )}
    </DragSensorsProvider>
  );
};

export default DragSortContainer;