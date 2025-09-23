import React, { useState } from 'react';
import { Space, Button, Tooltip, message } from 'antd';
import { ThunderboltOutlined, PoweroffOutlined, ReloadOutlined, DesktopOutlined, DisconnectOutlined } from '@ant-design/icons';
import { useAdb } from '../../application/hooks/useAdb';

interface Props {
  selectedIds?: string[];
}

export const BatchActionsBar: React.FC<Props> = ({ selectedIds = [] }) => {
  const { connectToEmulators, refreshDevices, runQuickDiagnostic, stopAdbServer, startAdbServer, batchDeviceOperation } = useAdb();
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
      <Tooltip title={selectedIds.length ? `批量断开 (${selectedIds.length})` : '先在列表勾选设备'}>
        <Button
          icon={<DisconnectOutlined />}
          disabled={selectedIds.length === 0}
          loading={loading}
          onClick={() => doAction(() => batchDeviceOperation(selectedIds, 'disconnect'), '已发起批量断开')}
          danger
        >
          批量断开
        </Button>
      </Tooltip>
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
