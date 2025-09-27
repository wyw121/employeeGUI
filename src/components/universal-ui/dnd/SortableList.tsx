import React from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

export interface SortableListProps {
  items: string[];
  strategy?: any;
  children: React.ReactNode;
  disabled?: boolean;
}

export const SortableList: React.FC<SortableListProps> = ({ items, strategy = verticalListSortingStrategy, children, disabled }) => {
  return (
    <SortableContext items={items} strategy={strategy} disabled={disabled}>
      {children}
    </SortableContext>
  );
};

export default SortableList;
