import React from 'react';
import { Space, Button, Tooltip } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons';
import type { DeviceToolbarProps } from './types';

export const DeviceToolbar: React.FC<DeviceToolbarProps> = ({ isTracking, onStart, onStop, onRefresh, onRestartAdb }) => {
  return (
    <Space>
      <Button
        type={isTracking ? 'default' : 'primary'}
        icon={isTracking ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
        onClick={isTracking ? onStop : onStart}
      >
        {isTracking ? '停止跟踪' : '启动跟踪'}
      </Button>
      <Tooltip title="刷新当前设备列表（不重新建连）">
        <Button icon={<ReloadOutlined />} onClick={onRefresh} disabled={!isTracking}>
          刷新
        </Button>
      </Tooltip>
      <Tooltip title="重启 ADB 服务（一般用于异常恢复）">
        <Button icon={<ThunderboltOutlined />} onClick={onRestartAdb} danger>
          重启ADB
        </Button>
      </Tooltip>
    </Space>
  );
};
