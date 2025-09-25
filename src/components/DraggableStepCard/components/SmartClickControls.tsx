import React from 'react';

interface SmartClickControlsProps {
  step: { id: string; parameters: any };
  onUpdate: (partial: { retries?: number; delay_ms?: number }) => void;
}

export const SmartClickControls: React.FC<SmartClickControlsProps> = ({ step, onUpdate }) => {
  const retries = step.parameters?.retries ?? 1;
  const delay = step.parameters?.delay_ms ?? 0;
  return (
    <div className="ml-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <span className="text-xs text-gray-500">重试</span>
      <input
        type="number"
        className="w-12 border rounded px-1 text-xs"
        value={retries}
        min={0}
        onChange={(e) => onUpdate({ retries: Number(e.target.value) })}
      />
      <span className="text-xs text-gray-500">延迟(ms)</span>
      <input
        type="number"
        className="w-16 border rounded px-1 text-xs"
        value={delay}
        min={0}
        onChange={(e) => onUpdate({ delay_ms: Number(e.target.value) })}
      />
    </div>
  );
};

export default SmartClickControls;
