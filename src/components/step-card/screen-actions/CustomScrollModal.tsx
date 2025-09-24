import React, { useState } from 'react';
import { Modal, Form, Radio, InputNumber } from 'antd';

export type ScrollDirection = 'up' | 'down' | 'left' | 'right';

export interface CustomScrollConfig {
  direction: ScrollDirection;
  distance: number;
  speed_ms: number;
  times: number; // 批量次数，1 表示单步
}

export interface CustomScrollModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: (config: CustomScrollConfig) => void;
}

const stopAll = (e: React.SyntheticEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

export const CustomScrollModal: React.FC<CustomScrollModalProps> = ({ open, onCancel, onConfirm }) => {
  const [form] = Form.useForm<CustomScrollConfig>();
  const [dir, setDir] = useState<ScrollDirection>('down');
  const [distance, setDistance] = useState<number>(600);
  const [speed, setSpeed] = useState<number>(300);
  const [times, setTimes] = useState<number>(1);

  return (
    <div onClick={stopAll} onMouseDown={stopAll} onPointerDown={stopAll} onTouchStart={stopAll}>
      <Modal
        title="自定义滚动"
        open={open}
        onCancel={onCancel}
        okText="确定"
        cancelText="取消"
        onOk={() => onConfirm({ direction: dir, distance, speed_ms: speed, times })}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="方向">
            <Radio.Group value={dir} onChange={(e) => setDir(e.target.value)}>
              <Radio.Button value="down">向下</Radio.Button>
              <Radio.Button value="up">向上</Radio.Button>
              <Radio.Button value="left">向左</Radio.Button>
              <Radio.Button value="right">向右</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="距离 (px)">
            <InputNumber min={50} max={3000} value={distance} onChange={(v) => setDistance(Number(v))} />
          </Form.Item>
          <Form.Item label="速度 (ms)">
            <InputNumber min={50} max={3000} value={speed} onChange={(v) => setSpeed(Number(v))} />
          </Form.Item>
          <Form.Item label="次数">
            <InputNumber min={1} max={20} value={times} onChange={(v) => setTimes(Number(v))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CustomScrollModal;
