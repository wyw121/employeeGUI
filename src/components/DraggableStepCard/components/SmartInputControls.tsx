import React from 'react';

interface SmartInputControlsProps {
  step: { id: string; parameters: any };
  onUpdate: (partial: { text?: string; clear_before?: boolean }) => void;
}

export const SmartInputControls: React.FC<SmartInputControlsProps> = ({ step, onUpdate }) => {
  const text = step.parameters?.text ?? '';
  const clear = !!step.parameters?.clear_before;
  return (
    <div className="ml-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <span className="text-xs text-gray-500">文本</span>
      <input
        type="text"
        className="w-44 border rounded px-2 py-0.5 text-xs"
        value={text}
        onChange={(e) => onUpdate({ text: e.target.value })}
        placeholder="输入要发送的文本"
      />
      <label className="text-xs text-gray-500 inline-flex items-center gap-1">
        <input
          type="checkbox"
          checked={clear}
          onChange={(e) => onUpdate({ clear_before: e.target.checked })}
        />
        先清空
      </label>
    </div>
  );
};

export default SmartInputControls;
