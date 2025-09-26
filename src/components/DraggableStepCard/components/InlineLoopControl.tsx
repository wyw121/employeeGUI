import React, { useState } from 'react';
import { Button, Modal, InputNumber, Space, Tag, Tooltip } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

type Props = {
  stepId: string;
  parameters: Record<string, any> | undefined;
  onUpdateStepParameters?: (id: string, nextParams: any) => void;
};

/**
 * InlineLoopControl
 * - 为单个步骤提供“内置循环次数（inline_loop_count）”设置
 * - 点击“创建循环”弹出设置框；保存后写入 step.parameters.inline_loop_count
 * - 若已设置（>1），显示“循环 N 次”并支持调整或移除
 */
export const InlineLoopControl: React.FC<Props> = ({ stepId, parameters, onUpdateStepParameters }) => {
  const inlineCount: number = Math.max(1, Number(parameters?.inline_loop_count ?? 1));
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<number>(inlineCount);

  const handleOpen = (e?: React.MouseEvent) => { e?.stopPropagation?.(); setValue(inlineCount); setOpen(true); };
  const handleCancel = () => setOpen(false);
  const handleSave = () => {
    const next = Math.max(1, Math.min(50, Math.floor(value || 1)));
    onUpdateStepParameters?.(stepId, { ...(parameters || {}), inline_loop_count: next });
    setOpen(false);
  };
  const handleRemove = (e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    const next = { ...(parameters || {}) };
    delete (next as any).inline_loop_count;
    onUpdateStepParameters?.(stepId, next);
  };

  if (!onUpdateStepParameters) return null;

  return (
    <>
      {inlineCount > 1 ? (
        <Space size={4}>
          <Tooltip title="已设置内置循环次数，点击调整">
            <Tag color="gold" onClick={handleOpen} style={{ cursor: 'pointer' }}>循环 {inlineCount} 次</Tag>
          </Tooltip>
          <Button size="small" type="text" onClick={handleRemove} style={{ padding: '0 4px' }}>移除</Button>
        </Space>
      ) : (
        <Button size="small" type="link" icon={<ReloadOutlined />} onClick={handleOpen} style={{ padding: '0 4px' }}>
          创建循环
        </Button>
      )}

      <Modal
        title="设置内置循环次数"
        open={open}
        onOk={handleSave}
        onCancel={handleCancel}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <div className="space-y-2">
          <div className="text-sm text-gray-600">无需使用“循环开始/结束”包裹，直接让本步骤重复执行。</div>
          <div className="flex items-center gap-2">
            <span>次数：</span>
            <InputNumber min={1} max={50} value={value} onChange={(v) => setValue(Number(v || 1))} />
            <span className="text-xs text-gray-400">建议范围 1-50</span>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default InlineLoopControl;
