import { useCallback, useMemo } from 'react';
import { PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

export interface UseStepDragAndDropOptions<T extends { id: string }> {
  steps: T[];
  onStepsChange: (steps: T[]) => void;
  activationDistance?: number;
}

export function useStepDragAndDrop<T extends { id: string }>(options: UseStepDragAndDropOptions<T>) {
  const { steps, onStepsChange, activationDistance = 8 } = options;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: activationDistance } })
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
