import React from 'react';
import { Result, Button, Space } from 'antd';
import { UseAuthWizard } from '../useAuthWizard';
import { AuthStep } from '../types';

export const Done: React.FC<{ ctx: UseAuthWizard }> = ({ ctx }) => {
  const { dispatch, api } = ctx;
  return (
    <Result
      status="success"
      title="授权流程完成"
      subTitle="你可以返回设备监控继续操作，或再次刷新设备确认状态。"
      extra={
        <Space>
          <Button type="primary" onClick={api.refreshDevices}>刷新设备</Button>
          <Button onClick={() => dispatch({ type: 'RESET' })}>重新开始</Button>
        </Space>
      }
    />
  );
};

export default Done;
