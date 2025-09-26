import React from 'react';
import { Input, Typography } from 'antd';

const { Text } = Typography;

interface TitleEditorProps {
  value: string;
  editing: boolean;
  onBeginEdit: (e: React.MouseEvent) => void;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const TitleEditor: React.FC<TitleEditorProps> = ({ value, editing, onBeginEdit, onChange, onSave, onCancel }) => {
  if (editing) {
    return (
      <Input
        size="small"
        value={value}
        autoFocus
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onChange(e.target.value)}
        onPressEnter={(e) => { e.stopPropagation(); onSave(); }}
        onBlur={onSave}
        onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onCancel(); } }}
        style={{ maxWidth: 220 }}
      />
    );
  }

  return (
    <Text strong onDoubleClick={onBeginEdit} title="双击编辑标题">
      {value}
    </Text>
  );
};
