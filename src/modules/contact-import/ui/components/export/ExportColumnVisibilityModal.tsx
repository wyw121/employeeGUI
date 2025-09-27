import React, { useMemo, useState } from 'react';
import { Modal, Checkbox, Space, Button } from 'antd';
import type { ExportOptions } from '../../../utils/exportTypes';

interface Props {
  open: boolean;
  onClose: () => void;
  options: ExportOptions;
  onChange: (next: ExportOptions) => void;
  availableKeys: string[]; // 上层根据 includeAssignmentColumns 计算
}

const ExportColumnVisibilityModal: React.FC<Props> = ({ open, onClose, options, onChange, availableKeys }) => {
  const initial = useMemo(() => {
    if (options.visibleColumns && options.visibleColumns.length) return options.visibleColumns;
    return availableKeys;
  }, [options.visibleColumns, availableKeys]);

  const [checked, setChecked] = useState<string[]>(initial);

  const allChecked = checked.length === availableKeys.length;
  const indeterminate = checked.length > 0 && !allChecked;

  const toggleAll = (v: boolean) => {
    setChecked(v ? availableKeys : []);
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="选择导出列"
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button onClick={() => setChecked(availableKeys)}>全选</Button>
          <Button onClick={() => setChecked([])}>全不选</Button>
          <Button onClick={() => { onChange({ ...options, visibleColumns: checked }); onClose(); }} type="primary">保存</Button>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Checkbox 
          indeterminate={indeterminate}
          checked={allChecked}
          onChange={(e) => toggleAll(e.target.checked)}
        >全选</Checkbox>
        <Checkbox.Group
          style={{ width: '100%' }}
          value={checked}
          onChange={(v) => setChecked(v as string[])}
        >
          <Space direction="vertical">
            {availableKeys.map(k => (
              <Checkbox key={k} value={k}>{options.customHeaderMap?.[k] ?? (k)}</Checkbox>
            ))}
          </Space>
        </Checkbox.Group>
      </Space>
    </Modal>
  );
};

export default ExportColumnVisibilityModal;
