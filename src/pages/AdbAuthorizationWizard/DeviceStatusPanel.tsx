import React from 'react';
import { Alert, Space, Spin } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import type { DeviceStatusPanelProps } from './types';

export const DeviceStatusPanel: React.FC<DeviceStatusPanelProps> = ({ devices, isLoading }) => {
  if (isLoading) {
    return <Spin />;
  }

  if (!devices || devices.length === 0) {
    return <Alert type="warning" showIcon message="未检测到设备" description="请完成前述步骤后，点击‘刷新设备’或重插数据线。" />;
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {devices.map((d) => (
        <Alert key={d.id} type="success" showIcon message={(
          <Space>
            <CheckCircleOutlined />
            <span>{(d as any).getDisplayName ? (d as any).getDisplayName() : d.id}</span>
          </Space>
        )} />
      ))}
    </Space>
  );
};
