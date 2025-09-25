import React from 'react';
import { ScrollDirectionSelector, ScrollParamsEditor } from '../../step-card';

interface SmartScrollControlsProps {
  step: { id: string; parameters: any };
  onUpdate: (partial: { distance?: number; speed_ms?: number; direction?: string }) => void;
}

export const SmartScrollControls: React.FC<SmartScrollControlsProps> = ({ step, onUpdate }) => {
  return (
    <div
      className="ml-2 flex items-center gap-2"
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <ScrollDirectionSelector
        value={step.parameters?.direction ?? 'down'}
        onChange={(dir) => onUpdate({ direction: dir })}
      />
      <ScrollParamsEditor
        value={{
          distance: step.parameters?.distance,
          speed_ms: step.parameters?.speed_ms,
        }}
        onChange={(val) => onUpdate(val)}
      />
    </div>
  );
};

export default SmartScrollControls;
