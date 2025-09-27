import { useCallback, useMemo } from 'react';
import { PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

export interface UseStepDragAndDropOptions<T extends { id: string }> {
  steps: T[];
  onStepsChange: (steps: T[]) => void;
  activationDistance?: number;
  activationDelayMs?: number;
  activationTolerance?: number;
}

export function useStepDragAndDrop<T extends { id: string }>(options: UseStepDragAndDropOptions<T>) {
  const { steps, onStepsChange, activationDistance = 6, activationDelayMs = 100, activationTolerance = 8 } = options;

  // 更稳健的激活约束：优先使用 delay + tolerance，避免轻微指针抖动触发拖拽
  const sensors = useSensors(
    useSensor(PointerSensor, { 
      activationConstraint: activationDistance !== undefined 
        ? { distance: activationDistance }
        : { delay: activationDelayMs, tolerance: activationTolerance }
    })
  );

  const stepIds = useMemo(() => steps.map(s => s.id), [steps]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = steps.findIndex(s => s.id === active.id);
    const newIndex = steps.findIndex(s => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(steps, oldIndex, newIndex);
    onStepsChange(reordered);
  }, [steps, onStepsChange]);

  return { sensors, stepIds, handleDragEnd };
}
