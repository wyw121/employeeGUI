import React from 'react';
import { Alert, Button, Space, Typography } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import { UseAuthWizard } from '../useAuthWizard';

const { Paragraph, Text } = Typography;

export const Prerequisites: React.FC<{ ctx: UseAuthWizard }> = ({ ctx }) => {
  const { state, dispatch, api } = ctx;
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Alert showIcon type="info" message="准备工作" description={
        <Space direction="vertical">
          <div>1) 手机端开启开发者选项与 USB 调试</div>
          <div>2) 连接数据线，确认弹窗的“允许 USB 调试”</div>
          <div>3) 如果授权异常可尝试一键修复（清钥+重启ADB+刷新）</div>
        </Space>
      } />
      <Paragraph>
        如果授权失败或设备状态异常，点击下方按钮尝试快速修复。
      </Paragraph>
      <Button type="primary" icon={<ThunderboltOutlined />} loading={state.busy} onClick={api.oneClickRecover}>一键全链路修复</Button>
      <Text type="secondary">顺序：清理本机密钥 → 重启 ADB → 刷新设备</Text>
      <Space>
        <Button type="primary" onClick={() => dispatch({ type: 'NEXT' })}>下一步</Button>
      </Space>
    </Space>
  );
};

export default Prerequisites;
