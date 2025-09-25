import React, { useState } from 'react';
import { Modal, Radio, InputNumber, Space, Typography, Divider } from 'antd';

export interface EdgeBackGestureConfig {
  edge: 'left' | 'right';
  y_percent: number; // 0-100
  distance_percent: number; // 5-95
  duration?: number; // ms
}

export interface EdgeBackGestureModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: (cfg: EdgeBackGestureConfig) => void;
  initial?: Partial<EdgeBackGestureConfig>;
}

export const EdgeBackGestureModal: React.FC<EdgeBackGestureModalProps> = ({ open, onCancel, onConfirm, initial }) => {
  const [edge, setEdge] = useState<EdgeBackGestureConfig['edge']>(initial?.edge || 'left');
  const [yPercent, setYPercent] = useState<number>(initial?.y_percent ?? 50);
  const [distancePercent, setDistancePercent] = useState<number>(initial?.distance_percent ?? 45);
  const [duration, setDuration] = useState<number>(initial?.duration ?? 260);

  const handleOk = () => {
    const yp = Math.max(0, Math.min(100, Math.round(yPercent)));
    const dp = Math.max(5, Math.min(95, Math.round(distancePercent)));
    const du = Math.max(120, Math.min(1200, Math.round(duration)));
    onConfirm({ edge, y_percent: yp, distance_percent: dp, duration: du });
  };

  return (
    <Modal
      open={open}
      title={
        <div className="flex items-center gap-2">
          <span>🧭 自定义全面屏返回手势</span>
        </div>
      }
      okText="确定"
      cancelText="取消"
      onOk={handleOk}
      onCancel={onCancel}
      width={520}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div>
          <Typography.Text strong>起始边缘</Typography.Text>
          <div style={{ marginTop: 8 }}>
            <Radio.Group value={edge} onChange={(e) => setEdge(e.target.value)}>
              <Radio.Button value="left">左边缘 → 右滑</Radio.Button>
              <Radio.Button value="right">右边缘 → 左滑</Radio.Button>
            </Radio.Group>
          </div>
        </div>

        <Divider style={{ margin: '8px 0' }} />

        <div className="flex items-center justify-between" style={{ gap: 12 }}>
          <div className="flex-1">
            <Typography.Text strong>Y 轴位置（百分比）</Typography.Text>
            <div className="text-xs text-gray-500">手势的高度位置，0 顶部，100 底部</div>
          </div>
          <InputNumber min={0} max={100} value={yPercent} onChange={(v) => setYPercent(v ?? 50)} addonAfter="%" />
        </div>

        <div className="flex items-center justify-between" style={{ gap: 12 }}>
          <div className="flex-1">
            <Typography.Text strong>滑动距离（百分比）</Typography.Text>
            <div className="text-xs text-gray-500">从边缘起点向内的水平距离，建议 35% ~ 55%</div>
          </div>
          <InputNumber min={5} max={95} value={distancePercent} onChange={(v) => setDistancePercent(v ?? 45)} addonAfter="%" />
        </div>

        <div className="flex items-center justify-between" style={{ gap: 12 }}>
          <div className="flex-1">
            <Typography.Text strong>持续时间（毫秒）</Typography.Text>
            <div className="text-xs text-gray-500">建议 200~400ms，过短可能不触发返回</div>
          </div>
          <InputNumber min={120} max={1200} step={20} value={duration} onChange={(v) => setDuration(v ?? 260)} addonAfter="ms" />
        </div>
      </Space>
    </Modal>
  );
};

export default EdgeBackGestureModal;
