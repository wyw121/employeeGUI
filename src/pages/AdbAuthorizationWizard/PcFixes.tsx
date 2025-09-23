import React from 'react';
import { Space, Button, Typography, Alert } from 'antd';
import { ReloadOutlined, KeyOutlined } from '@ant-design/icons';
import type { PcFixesProps } from './types';

const { Paragraph, Text } = Typography;

export const PcFixes: React.FC<PcFixesProps> = ({ isBusy, onRestartAdb, onClearKeys, onRefreshDevices }) => {
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Paragraph>如果还是不弹授权或显示 unauthorized，可尝试以下动作：</Paragraph>
      <Space wrap>
        <Button icon={<ReloadOutlined />} type="primary" loading={isBusy} onClick={async () => { await onRestartAdb(); await onRefreshDevices(); }}>重启 ADB 服务</Button>
        <Button icon={<KeyOutlined />} danger loading={isBusy} onClick={async () => { await onClearKeys(); await onRestartAdb(); }}>清理本机 ADB 密钥</Button>
        <Button onClick={onRefreshDevices}>刷新设备</Button>
      </Space>
      <Text type="secondary">清理密钥会让电脑遗忘这台设备的授权记录，下次连接会重新弹出授权提示。</Text>
      <Alert type="warning" showIcon message="提示" description="清理后请重新插拔 USB 线，并在手机上勾选‘始终允许来自此计算机’。" />
    </Space>
  );
};
