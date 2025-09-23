import React from 'react';
import { Alert, Button, Form, Input, Space } from 'antd';
import { WifiOutlined, LinkOutlined } from '@ant-design/icons';
import { UseAuthWizard } from '../useAuthWizard';
import { isValidHostPort, isValidIp, isValidPort, isValidPairCode } from '../utils/validators';

export const Wireless: React.FC<{ ctx: UseAuthWizard }> = ({ ctx }) => {
  const { state, dispatch, api } = ctx;
  const [pairForm] = Form.useForm();
  const [connectForm] = Form.useForm();
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Alert showIcon type="info" message="无线调试（Android 11+）" description="如果你的设备支持无线调试，可在同一局域网内进行配对与连接。" />
      <Form form={pairForm} layout="inline">
        <Form.Item name="pairHostPort" label="配对地址" rules={[{ required: true, message: '如 192.168.1.10:37061' }, { validator: (_, v) => isValidHostPort(v) ? Promise.resolve() : Promise.reject(new Error('格式 host:port 不正确')) }]}>
          <Input placeholder="192.168.1.10:37061" style={{ width: 220 }} />
        </Form.Item>
        <Form.Item name="pairCode" label="配对码" rules={[{ required: true }, { validator: (_, v) => isValidPairCode(v) ? Promise.resolve() : Promise.reject(new Error('配对码格式不正确')) }]}>
          <Input placeholder="xxxxxx" style={{ width: 120 }} />
        </Form.Item>
        <Form.Item>
          <Button icon={<WifiOutlined />} loading={state.busy} onClick={async () => {
            const { pairHostPort, pairCode } = await pairForm.validateFields();
            await api.pairWireless(pairHostPort, pairCode);
          }}>配对</Button>
        </Form.Item>
      </Form>
      <Form form={connectForm} layout="inline">
        <Form.Item name="ip" label="设备IP" rules={[{ required: true }, { validator: (_, v) => isValidIp(v) ? Promise.resolve() : Promise.reject(new Error('IP 地址不合法')) }]}>
          <Input placeholder="192.168.1.10" style={{ width: 200 }} />
        </Form.Item>
        <Form.Item name="port" label="端口" rules={[{ required: true }, { validator: (_, v) => isValidPort(v) ? Promise.resolve() : Promise.reject(new Error('端口不合法')) }]} initialValue={5555}>
          <Input placeholder="5555" style={{ width: 100 }} />
        </Form.Item>
        <Form.Item>
          <Button icon={<LinkOutlined />} loading={state.busy} onClick={async () => {
            const { ip, port } = await connectForm.validateFields();
            const p = parseInt(String(port), 10);
            await api.connectWireless(String(ip), Number.isFinite(p) ? p : 5555);
          }}>连接（请用上方表单）</Button>
        </Form.Item>
      </Form>
      <Space>
        <Button onClick={() => dispatch({ type: 'PREV' })}>上一步</Button>
        <Button type="primary" onClick={() => dispatch({ type: 'NEXT' })}>下一步</Button>
      </Space>
    </Space>
  );
};

export default Wireless;
