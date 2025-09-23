import React from 'react';
import { Space, Button, Tooltip } from 'antd';
import { ReloadOutlined, ThunderboltOutlined, BugOutlined, KeyOutlined } from '@ant-design/icons';
import { useAdb } from '../../application/hooks/useAdb';

export const HeaderToolbar: React.FC = () => {
  const { refreshDevices, restartAdbServer, runQuickDiagnostic, clearAdbKeys } = useAdb();

  return (
    <Space>
      <Tooltip title="刷新设备列表">
        <Button icon={<ReloadOutlined />} onClick={refreshDevices}>刷新</Button>
      </Tooltip>
      <Tooltip title="重启ADB服务">
        <Button icon={<ThunderboltOutlined />} onClick={restartAdbServer} danger>重启ADB</Button>
      </Tooltip>
      <Tooltip title="快速诊断">
        <Button icon={<BugOutlined />} onClick={runQuickDiagnostic}>快速诊断</Button>
      </Tooltip>
      <Tooltip title="清理本机ADB密钥（需手机重新授权）">
        <Button icon={<KeyOutlined />} onClick={clearAdbKeys}>清理密钥</Button>
      </Tooltip>
    </Space>
  );
};

export default HeaderToolbar;
