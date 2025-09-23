import React, { useState } from 'react';
import { Space, Button, Tooltip, message } from 'antd';
import { ThunderboltOutlined, PoweroffOutlined, ReloadOutlined, DesktopOutlined } from '@ant-design/icons';
import { useAdb } from '../../application/hooks/useAdb';

export const BatchActionsBar: React.FC = () => {
  const { connectToEmulators, refreshDevices, runQuickDiagnostic, stopAdbServer, startAdbServer } = useAdb();
  const [loading, setLoading] = useState(false);

  const doAction = async (fn: () => Promise<any>, ok: string) => {
    setLoading(true);
    try {
      await fn();
      message.success(ok);
    } catch (e: any) {
      message.error(e?.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Space wrap>
      <Tooltip title="批量连接模拟器">
        <Button icon={<DesktopOutlined />} loading={loading} onClick={() => doAction(connectToEmulators, '已尝试连接模拟器')}>
          模拟器
        </Button>
      </Tooltip>
      <Tooltip title="快速诊断所有设备/连接">
        <Button icon={<ThunderboltOutlined />} loading={loading} onClick={() => doAction(runQuickDiagnostic, '快速诊断已完成')}>
          快速诊断
        </Button>
      </Tooltip>
      <Tooltip title="刷新设备列表">
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => doAction(refreshDevices, '已刷新设备列表')}>
          刷新
        </Button>
      </Tooltip>
      <Tooltip title="停止 ADB 服务">
        <Button icon={<PoweroffOutlined />} danger loading={loading} onClick={() => doAction(stopAdbServer, 'ADB 已停止')}>
          停止ADB
        </Button>
      </Tooltip>
      <Tooltip title="启动 ADB 服务">
        <Button icon={<PoweroffOutlined rotate={180} />} type="primary" loading={loading} onClick={() => doAction(startAdbServer, 'ADB 已启动')}>
          启动ADB
        </Button>
      </Tooltip>
    </Space>
  );
};

export default BatchActionsBar;
