import React from 'react';

export const noDragProps = {
  onPointerDown: (e: React.SyntheticEvent) => e.stopPropagation(),
  onMouseDown: (e: React.SyntheticEvent) => e.stopPropagation(),
  onTouchStart: (e: React.SyntheticEvent) => e.stopPropagation(),
};

export function wrapNoDrag<T extends object>(Comp: React.ComponentType<T>): React.FC<T> {
  return function NoDragWrapper(props: T) {
    return <div {...noDragProps}><Comp {...props} /></div>;
  };
}
