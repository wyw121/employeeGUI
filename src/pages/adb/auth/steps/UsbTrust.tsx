import React from 'react';
import { Alert, Button, Space, Switch, Typography } from 'antd';
import { UsbOutlined, ReloadOutlined } from '@ant-design/icons';
import { UseAuthWizard } from '../useAuthWizard';

const { Text } = Typography;

export const UsbTrust: React.FC<{ ctx: UseAuthWizard }> = ({ ctx }) => {
  const { state, dispatch, api } = ctx;
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Alert showIcon type="info" message="USB 授权" description={
        <Space direction="vertical">
          <div>1) 请在手机上确认“允许 USB 调试”</div>
          <div>2) 如果没有弹窗，可重新插拔数据线或点“重启 ADB”后再试</div>
        </Space>
      } />
      <Space align="center">
        <UsbOutlined />
        <Text>我已在手机上点了“允许”：</Text>
        <Switch checked={state.userConfirmedUsbAllow} onChange={(v) => dispatch({ type: 'SET_USB_CONFIRMED', value: v })} />
      </Space>
      <Space>
        <Button onClick={api.restartAdbServer} icon={<ReloadOutlined />} loading={state.busy}>重启 ADB</Button>
        <Button onClick={api.refreshDevices}>刷新设备</Button>
      </Space>
      <Space>
        <Button onClick={() => dispatch({ type: 'PREV' })}>上一步</Button>
        <Button type="primary" onClick={() => dispatch({ type: 'NEXT' })} disabled={!state.userConfirmedUsbAllow}>下一步</Button>
      </Space>
    </Space>
  );
};

export default UsbTrust;
