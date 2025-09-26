import React from 'react';
import { Space, Tag, Tooltip } from 'antd';
import type { ScrcpyCapabilities } from '../../../../application/services/ScrcpyApplicationService';

export interface CapabilityChipsProps {
  caps: ScrcpyCapabilities | null;
}

const labelMap: { key: keyof ScrcpyCapabilities; label: string; tip: string }[] = [
  { key: 'maxSize', label: 'Max Size', tip: '支持 --max-size 设置分辨率/最大边像素' },
  { key: 'bitRate', label: 'Bitrate', tip: '支持 --bit-rate 设置视频码率' },
  { key: 'maxFps', label: 'Max FPS', tip: '支持 --max-fps 限制帧率' },
  { key: 'alwaysOnTop', label: 'Always on Top', tip: '支持 --always-on-top 置顶' },
  { key: 'windowBorderless', label: 'Borderless', tip: '支持 --window-borderless 无边框' },
];

export const CapabilityChips: React.FC<CapabilityChipsProps> = ({ caps }) => {
  if (!caps) return null;
  return (
    <Space wrap size={6}>
      {labelMap.map(({ key, label, tip }) => {
        const ok = caps[key];
        return (
          <Tooltip title={tip} key={key}>
            <Tag color={ok ? 'green' : 'default'}>{label}{ok ? '' : ' (N/A)'}</Tag>
          </Tooltip>
        );
      })}
    </Space>
  );
};

export default CapabilityChips;
