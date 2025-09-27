import React from 'react';
import { Input } from 'antd';
import { noDragProps } from '../../universal-ui/dnd/noDrag';

interface DescriptionEditorProps {
  value: string;
  editing: boolean;
  onBeginEdit: (e: React.MouseEvent) => void;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const DescriptionEditor: React.FC<DescriptionEditorProps> = ({ value, editing, onBeginEdit, onChange, onSave, onCancel }) => {
  if (editing) {
    return (
      <Input.TextArea
        rows={2}
        value={value}
        autoSize={{ minRows: 2, maxRows: 4 }}
        autoFocus
        onClick={(e) => e.stopPropagation()}
        {...noDragProps}
        onChange={(e) => onChange(e.target.value)}
        onPressEnter={(e) => { e.stopPropagation(); onSave(); }}
        onBlur={onSave}
        onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onCancel(); } }}
      />
    );
  }

  return (
    <span onDoubleClick={onBeginEdit} title="双击编辑描述">
      {value}
    </span>
  );
};
