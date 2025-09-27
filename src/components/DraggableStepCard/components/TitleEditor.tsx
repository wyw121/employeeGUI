import React from 'react';
import { Input, Typography } from 'antd';
import { noDragProps } from '../../universal-ui/dnd/noDrag';

const { Text } = Typography;

interface TitleEditorProps {
  value: string;
  editing: boolean;
  onBeginEdit: (e: React.MouseEvent) => void;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  className?: string;
}

export const TitleEditor: React.FC<TitleEditorProps> = ({ value, editing, onBeginEdit, onChange, onSave, onCancel, className }) => {
  if (editing) {
    return (
      <Input
        size="small"
        value={value}
        autoFocus
        onClick={(e) => e.stopPropagation()}
        {...noDragProps}
        onChange={(e) => onChange(e.target.value)}
        onPressEnter={(e) => { e.stopPropagation(); onSave(); }}
        onBlur={onSave}
        onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onCancel(); } }}
        style={{ maxWidth: 220 }}
      />
    );
  }

  return (
    <Text strong onDoubleClick={onBeginEdit} title="双击编辑标题" className={className}>
      {value}
    </Text>
  );
};
