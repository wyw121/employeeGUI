import React, { useCallback, useState } from 'react';
import { Card, Space, Button, Typography, Tag, Tooltip, message } from 'antd';
import { InfoCircleOutlined, DisconnectOutlined, ReloadOutlined, CopyOutlined, ThunderboltOutlined, ExperimentOutlined } from '@ant-design/icons';
import { useAdb } from '../../application/hooks/useAdb';

const { Text } = Typography;

export const DeviceActionsPanel: React.FC = () => {
  const { selectedDevice, refreshDevices, disconnectDevice, getDeviceInfo, runQuickDiagnostic, restartAdbServer } = useAdb();
  const [loading, setLoading] = useState(false);

  const onCopyId = useCallback(async () => {
    if (!selectedDevice?.id) return;
    await navigator.clipboard.writeText(selectedDevice.id);
    message.success('设备 ID 已复制');
  }, [selectedDevice]);

  const onDisconnect = useCallback(async () => {
    if (!selectedDevice?.id) return;
    setLoading(true);
    try {
      await disconnectDevice(selectedDevice.id);
      message.success('已请求断开连接');
    } catch (e: any) {
      message.error(e?.message || '断开失败');
    } finally {
      setLoading(false);
    }
  }, [disconnectDevice, selectedDevice]);

  const onDetails = useCallback(async () => {
    if (!selectedDevice?.id) return;
    setLoading(true);
    try {
      const info = await getDeviceInfo(selectedDevice.id);
      message.info(`设备信息: ${JSON.stringify(info).slice(0, 200)}...`);
    } catch (e: any) {
      message.error(e?.message || '获取信息失败');
    } finally {
      setLoading(false);
    }
  }, [getDeviceInfo, selectedDevice]);

  const onQuickDiag = useCallback(async () => {
    setLoading(true);
    try {
      await runQuickDiagnostic();
      message.success('快速诊断完成');
    } catch (e: any) {
      message.error(e?.message || '诊断失败');
    } finally {
      setLoading(false);
    }
  }, [runQuickDiagnostic]);

  return (
    <Card title="选中设备" size="small" extra={selectedDevice?.id ? <Tag color={selectedDevice.isOnline?.() ? 'green' : 'default'}>{selectedDevice.isOnline?.() ? '在线' : '离线'}</Tag> : null}>
      {!selectedDevice ? (
        <Text type="secondary">未选中设备。请在左侧列表中选择一个设备。</Text>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>ID：</Text>
            <Text copyable>{(selectedDevice as any).id}</Text>
          </div>
          {typeof (selectedDevice as any).getDisplayName === 'function' && (
            <div>
              <Text strong>名称：</Text>
              <Text>{(selectedDevice as any).getDisplayName()}</Text>
            </div>
          )}

          <Space wrap>
            <Tooltip title="设备详情">
              <Button icon={<InfoCircleOutlined />} onClick={onDetails} loading={loading}>
                详情
              </Button>
            </Tooltip>
            <Tooltip title="复制设备ID">
              <Button icon={<CopyOutlined />} onClick={onCopyId}>
                复制ID
              </Button>
            </Tooltip>
            <Tooltip title="断开连接">
              <Button icon={<DisconnectOutlined />} onClick={onDisconnect} loading={loading} danger>
                断开
              </Button>
            </Tooltip>
            <Tooltip title="刷新设备列表">
              <Button icon={<ReloadOutlined />} onClick={refreshDevices}>
                刷新
              </Button>
            </Tooltip>
            <Tooltip title="快速诊断">
              <Button icon={<ExperimentOutlined />} onClick={onQuickDiag} loading={loading}>
                快速诊断
              </Button>
            </Tooltip>
            <Tooltip title="重启ADB服务">
              <Button icon={<ThunderboltOutlined />} onClick={restartAdbServer} danger>
                重启ADB
              </Button>
            </Tooltip>
          </Space>
        </Space>
      )}
    </Card>
  );
};

export default DeviceActionsPanel;
