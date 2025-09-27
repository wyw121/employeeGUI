import React from 'react';
import { DndContext, type UniqueIdentifier } from '@dnd-kit/core';
import { PointerSensor, useSensor, useSensors } from '@dnd-kit/core';

export interface DragSensorsProviderProps {
  children: React.ReactNode;
  /** 距离触发优先，避免长按；如未提供则使用默认 6px */
  activationDistance?: number;
  /** 备用：长按触发（不推荐，可能误判为空白区拖不动） */
  activationDelayMs?: number;
  activationTolerance?: number;
  /** 透传给 DndContext 的其他属性 */
  onDragEnd?: (event: any) => void;
  onDragStart?: (event: any) => void;
  onDragOver?: (event: any) => void;
  collisionDetection?: any;
}

export const DragSensorsProvider: React.FC<DragSensorsProviderProps> = ({
  children,
  activationDistance = 6,
  activationDelayMs = 100,
  activationTolerance = 8,
  ...ctxProps
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: activationDistance != null
        ? { distance: activationDistance }
        : { delay: activationDelayMs, tolerance: activationTolerance },
    })
  );

  return (
    <DndContext sensors={sensors} {...ctxProps}>
      {children}
    </DndContext>
  );
};

export default DragSensorsProvider;
