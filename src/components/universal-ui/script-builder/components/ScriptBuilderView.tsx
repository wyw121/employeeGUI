import React from 'react';
import { useScriptBuilderState } from '../hooks/useScriptBuilderState';
import { useScriptValidation } from '../hooks/useScriptValidation';
import { ScriptStep } from '../types';

// 精简视图：后续逐步将旧巨型组件逻辑迁入或由调用方替换旧 <UniversalScriptBuilder />
export interface ScriptBuilderViewProps {
  initialSteps?: ScriptStep[];
  onChange?: (steps: ScriptStep[]) => void;
}

export const ScriptBuilderView: React.FC<ScriptBuilderViewProps> = ({ initialSteps = [], onChange }) => {
  const { steps, addStep, removeStep, moveStep } = useScriptBuilderState(initialSteps);
  const validation = useScriptValidation(steps);

  // 变更回调（未来可用 useEffect 监听 steps）
  // ...预留

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">脚本构建器 (重构骨架)</h2>
        <button
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
          onClick={() =>
            addStep({
              id: `temp_${Date.now()}`,
              type: 'tap',
              name: '新步骤',
              description: '占位步骤',
              disabled: false,
              parameters: {},
              step_type: 'action',
              parent_loop_id: undefined,
            } as any)
          }
        >
          添加占位步骤
        </button>
      </div>

      <ul className="space-y-2">
        {steps.map((s, idx) => (
          <li key={s.id} className="border rounded p-2 flex items-center justify-between bg-white">
            <div>
              <div className="font-medium text-sm">#{idx + 1} {s.name || s.type}</div>
              <div className="text-xs text-gray-500">{s.description}</div>
            </div>
            <div className="flex space-x-2">
              <button
                className="text-xs px-2 py-1 bg-gray-100 rounded"
                disabled={idx === 0}
                onClick={() => moveStep(idx, idx - 1)}
              >上移</button>
              <button
                className="text-xs px-2 py-1 bg-gray-100 rounded"
                disabled={idx === steps.length - 1}
                onClick={() => moveStep(idx, idx + 1)}
              >下移</button>
              <button
                className="text-xs px-2 py-1 bg-red-500 text-white rounded"
                onClick={() => removeStep(s.id)}
              >删除</button>
            </div>
          </li>
        ))}
      </ul>

      <div className="text-sm text-gray-600">
        校验状态：{validation.isValid ? '✅ 通过' : '❌ 存在问题'} （{validation.issues.length} 项）
      </div>
    </div>
  );
};
