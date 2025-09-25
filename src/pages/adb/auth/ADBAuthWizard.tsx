import React from 'react';
import { Card, Steps, Space, Typography } from 'antd';
import { SafetyOutlined } from '@ant-design/icons';
import { AuthStep } from './types';
import { useAuthWizard } from './useAuthWizard';
import Prerequisites from './steps/Prerequisites';
import UsbTrust from './steps/UsbTrust';
import Wireless from './steps/Wireless';
import Verify from './steps/Verify';
import Done from './steps/Done';
import { ActionLogPanel } from './ActionLogPanel';

const { Paragraph } = Typography;

const ADBAuthWizard: React.FC = () => {
  const ctx = useAuthWizard();
  const { state } = ctx;

  const renderStep = () => {
    switch (state.step) {
      case AuthStep.PREREQUISITES: return <Prerequisites ctx={ctx} />;
      case AuthStep.USB_TRUST: return <UsbTrust ctx={ctx} />;
      case AuthStep.WIRELESS: return <Wireless ctx={ctx} />;
      case AuthStep.VERIFY: return <Verify ctx={ctx} />;
      case AuthStep.DONE: return <Done ctx={ctx} />;
      default: return null;
    }
  };

  return (
    <Card title={<Space><SafetyOutlined /><span>ADB 授权向导（最佳实践）</span></Space>}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Paragraph>按步骤完成 USB 授权与（可选的）无线调试，全部操作通过统一的 useAdb() 接口。</Paragraph>
        <Steps
          current={[AuthStep.PREREQUISITES, AuthStep.USB_TRUST, AuthStep.WIRELESS, AuthStep.VERIFY, AuthStep.DONE].indexOf(state.step)}
          onChange={(idx) => {
            const order = [AuthStep.PREREQUISITES, AuthStep.USB_TRUST, AuthStep.WIRELESS, AuthStep.VERIFY, AuthStep.DONE] as const;
            const target = order[idx];
            const currentIdx = order.indexOf(state.step);
            // 忙碌中禁用；仅允许回退
            if (!state.busy && idx <= currentIdx) {
              ctx.dispatch({ type: 'GOTO', step: target });
            }
          }}
          items={[
            { title: '准备' },
            { title: 'USB 授权' },
            { title: '无线调试' },
            { title: '验证' },
            { title: '完成' },
          ]}
        />
        {renderStep()}
  <ActionLogPanel logs={state.logs} onClear={() => ctx.dispatch({ type: 'CLEAR_LOGS' })} />
      </Space>
    </Card>
  );
};

export default ADBAuthWizard;
