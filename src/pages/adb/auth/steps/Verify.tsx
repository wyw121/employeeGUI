import React, { useMemo } from 'react';
import { Alert, Button, Space, Tag, Typography, Divider } from 'antd';
import { UseAuthWizard } from '../useAuthWizard.ts';
import { useAdb } from '../../../../application/hooks/useAdb';
import { DeviceStatus } from '../../../../domain/adb';
import DeviceSummary from '../components/DeviceSummary';

const { Text } = Typography;

export const Verify: React.FC<{ ctx: UseAuthWizard }> = ({ ctx }) => {
  const { dispatch, api } = ctx;
  const adb = useAdb();
  const summary = useMemo(() => {
    const total = adb.devices?.length ?? 0;
    const online = adb.devices?.filter(d => d.status === DeviceStatus.ONLINE || d.isOnline()).length ?? 0;
    const unauthorized = adb.devices?.filter(d => d.status === DeviceStatus.UNAUTHORIZED).length ?? 0;
    const offline = adb.devices?.filter(d => d.status === DeviceStatus.OFFLINE).length ?? 0;
    return { total, online, unauthorized, offline };
  }, [adb.devices]);
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Alert showIcon type="success" message="验证授权" description={
        <Space direction="vertical">
          <div>点击刷新设备，确认设备状态为 <Text code>device/online</Text>，若存在 <Text code>unauthorized</Text> 请回到上一步 USB 授权重试。</div>
          <div>
            设备统计：
            <Space size="small">
              <Tag>总数 {summary.total}</Tag>
              <Tag color="green">在线 {summary.online}</Tag>
              <Tag color="orange">未授权 {summary.unauthorized}</Tag>
              <Tag color="red">离线 {summary.offline}</Tag>
            </Space>
          </div>
        </Space>
      } />
      <Divider style={{ margin: '8px 0' }} />
      <DeviceSummary devices={adb.devices} maxItems={6} />
      <Space>
        <Button onClick={api.refreshDevices}>刷新设备</Button>
        <Button onClick={() => dispatch({ type: 'PREV' })}>上一步</Button>
        <Button type="primary" onClick={() => dispatch({ type: 'NEXT' })}>完成</Button>
      </Space>
    </Space>
  );
};

export default Verify;
