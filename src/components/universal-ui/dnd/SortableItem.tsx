import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface SortableItemProps {
  id: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export const SortableItem: React.FC<SortableItemProps> = ({ id, disabled, className, style, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });

  const inline: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
    touchAction: 'none',
    ...style,
  };

  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={className} style={inline}>
      {children}
    </div>
  );
};

export default SortableItem;
