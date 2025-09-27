import React, { useMemo, useState } from 'react';
import { Modal, Button, Space, List } from 'antd';
import type { ExportOptions } from '../../../utils/exportTypes';

interface Props {
  open: boolean;
  onClose: () => void;
  options: ExportOptions;
  onChange: (next: ExportOptions) => void;
  availableKeys: string[]; // 当前可导出的列 keys（由上层根据 includeAssignmentColumns 计算传入）
}

const ExportColumnOrderModal: React.FC<Props> = ({ open, onClose, options, onChange, availableKeys }) => {
  const initialOrder = useMemo(() => options.columnOrder && options.columnOrder.length ? options.columnOrder : availableKeys, [options.columnOrder, availableKeys]);
  const [order, setOrder] = useState<string[]>(initialOrder);

  const move = (idx: number, delta: number) => {
    const next = [...order];
    const to = idx + delta;
    if (to < 0 || to >= next.length) return;
    const [item] = next.splice(idx, 1);
    next.splice(to, 0, item);
    setOrder(next);
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="调整列顺序"
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button onClick={() => setOrder(availableKeys)}>恢复默认顺序</Button>
          <Button type="primary" onClick={() => { onChange({ ...options, columnOrder: order }); onClose(); }}>保存</Button>
        </Space>
      }
    >
      <List
        dataSource={order}
        renderItem={(k, idx) => (
          <List.Item actions={[
            <Button key="up" size="small" onClick={() => move(idx, -1)}>上移</Button>,
            <Button key="down" size="small" onClick={() => move(idx, +1)}>下移</Button>,
          ]}>
            <List.Item.Meta title={k} description={options.customHeaderMap?.[k]} />
          </List.Item>
        )}
      />
    </Modal>
  );
};

export default ExportColumnOrderModal;
