import React, { useState } from 'react';
import { Alert, Divider, Form, Input, Button, Space, Typography } from 'antd';
import { WifiOutlined, KeyOutlined } from '@ant-design/icons';
import type { WirelessPairingProps } from './types';

const { Paragraph } = Typography;

export const WirelessPairing: React.FC<WirelessPairingProps> = ({ onPair, onConnect }) => {
  const [pairForm] = Form.useForm();
  const [pairResult, setPairResult] = useState<string>('');

  return (
    <div>
      <Paragraph>手机：开发者选项 → 无线调试 → “使用配对码配对设备”，记下 IP:配对端口 与 6 位配对码。</Paragraph>
      <Form form={pairForm} layout="inline" onFinish={async (vals) => {
        const { hostPort, code } = vals as { hostPort: string; code: string };
        const out = await onPair(hostPort, code);
        setPairResult(out.trim());
      }}>
        <Form.Item name="hostPort" rules={[{ required: true, message: '请输入 IP:配对端口，如 192.168.1.10:37123' }]}>
          <Input style={{ width: 280 }} prefix={<WifiOutlined />} placeholder="192.168.1.10:37123" />
        </Form.Item>
        <Form.Item name="code" rules={[{ required: true, message: '请输入 6 位配对码' }]}>
          <Input style={{ width: 160 }} prefix={<KeyOutlined />} placeholder="123456" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">配对</Button>
        </Form.Item>
      </Form>
      {pairResult && (
        <Alert style={{ marginTop: 12 }} type={pairResult.includes('Successfully') ? 'success' : 'info'} showIcon message="配对结果" description={<pre style={{ whiteSpace: 'pre-wrap' }}>{pairResult}</pre>} />
      )}
      <Divider />
      <Paragraph>已配对后，手机无线调试界面会显示“IP:调试端口”，可以直接在此连接：</Paragraph>
      <Space>
        <Input.Group compact>
          <Form layout="inline" onFinish={async (vals) => {
            const ip = (vals as any).ip as string; const port = Number((vals as any).port);
            await onConnect(ip, port);
          }}>
            <Form.Item name="ip" rules={[{ required: true }]}>
              <Input style={{ width: 200 }} placeholder="192.168.1.10" />
            </Form.Item>
            <Form.Item name="port" rules={[{ required: true }]}>
              <Input style={{ width: 100 }} placeholder="5555" />
            </Form.Item>
            <Form.Item>
              <Button type="default" htmlType="submit">连接</Button>
            </Form.Item>
          </Form>
        </Input.Group>
      </Space>
    </div>
  );
};
