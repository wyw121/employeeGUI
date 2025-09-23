import React from 'react';
import { Space, InputNumber, Tooltip } from 'antd';

export interface ScrollParams {
  distance?: number; // 像素或相对单位
  speed_ms?: number; // 手势持续时间
}

interface ScrollParamsEditorProps {
  value?: ScrollParams;
  onChange?: (val: ScrollParams) => void;
  size?: 'small' | 'middle' | 'large';
}

export const ScrollParamsEditor: React.FC<ScrollParamsEditorProps> = ({
  value,
  onChange,
  size = 'small',
}) => {
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const v = value ?? {};
  return (
    <Space size={8}
      onPointerDown={stop}
      onMouseDown={stop}
      onTouchStart={stop}
      onClick={stop}
    >
      <Tooltip title="滚动距离 (px)">
        <InputNumber
          size={size}
          value={v.distance}
          min={10}
          max={4000}
          step={10}
          placeholder="距离(px)"
          onChange={(val) => onChange?.({ ...v, distance: Number(val) })}
        />
      </Tooltip>
      <Tooltip title="滚动时长 (ms)">
        <InputNumber
          size={size}
          value={v.speed_ms}
          min={50}
          max={5000}
          step={50}
          placeholder="时长(ms)"
          onChange={(val) => onChange?.({ ...v, speed_ms: Number(val) })}
        />
      </Tooltip>
    </Space>
  );
};

export default ScrollParamsEditor;
