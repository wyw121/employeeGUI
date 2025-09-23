import React from 'react';
import type { UiNode } from '../../types';

export interface SelectedFieldsPreviewProps {
  node: UiNode | null;
  fields: string[];
}

/**
 * 选中字段预览面板（模块化子组件）
 * - 仅负责展示层，不持有状态
 * - 通过 props 接收当前节点与字段列表
 */
export const SelectedFieldsPreview: React.FC<SelectedFieldsPreviewProps> = ({ node, fields }) => {
  if (!node || !fields || fields.length === 0) {
    return (
      <div className="text-xs text-neutral-400">未选择任何字段</div>
    );
  }

  return (
    <div className="mt-2 grid grid-cols-1 gap-1">
      {fields.map((f) => {
        const v = node.attrs?.[f];
        return (
          <div key={f} className="flex items-start text-xs">
            <span className="min-w-24 text-neutral-500">{f}：</span>
            <span className="flex-1 break-all text-neutral-800">{v ?? '—'}</span>
          </div>
        );
      })}
    </div>
  );
};

export default SelectedFieldsPreview;
