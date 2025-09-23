import React, { useState } from 'react';
import { Card, Form, Input, Button, Space, Typography, Divider, Switch, InputNumber } from 'antd';
import { WifiOutlined, UsbOutlined, SettingOutlined } from '@ant-design/icons';
import { WirelessConfig } from '../types';

const { Text, Paragraph } = Typography;

export interface WirelessConfigFormProps {
  config?: WirelessConfig | null;
  onSubmit: (config: WirelessConfig) => Promise<void>;
  loading?: boolean;
}

/**
 * 无线调试配置表单组件
 */
export const WirelessConfigForm: React.FC<WirelessConfigFormProps> = ({
  config,
  onSubmit,
  loading = false,
}) => {
  const [form] = Form.useForm();
  const [needsPairing, setNeedsPairing] = useState(false);

  const handleSubmit = async (values: any) => {
    const wirelessConfig: WirelessConfig = {
      ip: values.ip,
      port: values.port,
      pairPort: needsPairing ? values.pairPort : undefined,
      pairCode: needsPairing ? values.pairCode : undefined,
      isConnected: false,
    };

    await onSubmit(wirelessConfig);
  };

  return (
    <Card
      title={
        <Space>
          <WifiOutlined />
          <span>无线调试配置</span>
        </Space>
      }
      size="small"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          ip: config?.ip || '',
          port: config?.port || 5555,
          pairPort: config?.pairPort || 5556,
          pairCode: config?.pairCode || '',
        }}
      >
        <Paragraph type="secondary">
          请在手机的开发者选项中开启"无线调试"，然后填入以下信息：
        </Paragraph>

        <Form.Item
          label="设备 IP 地址"
          name="ip"
          rules={[
            { required: true, message: '请输入设备 IP 地址' },
            { 
              pattern: /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
              message: '请输入有效的 IP 地址格式'
            }
          ]}
        >
          <Input placeholder="例：192.168.1.100" />
        </Form.Item>

        <Form.Item
          label="连接端口"
          name="port"
          rules={[
            { required: true, message: '请输入连接端口' },
            { type: 'number', min: 1024, max: 65535, message: '端口号必须在 1024-65535 范围内' }
          ]}
        >
          <InputNumber 
            placeholder="5555" 
            style={{ width: '100%' }} 
            min={1024} 
            max={65535}
          />
        </Form.Item>

        <Form.Item label="首次连接需要配对">
          <Switch 
            checked={needsPairing} 
            onChange={setNeedsPairing}
            checkedChildren="需要"
            unCheckedChildren="不需要"
          />
          <Text type="secondary" style={{ marginLeft: 8 }}>
            首次连接或授权过期时需要配对
          </Text>
        </Form.Item>

        {needsPairing && (
          <>
            <Divider />
            
            <Form.Item
              label="配对端口"
              name="pairPort"
              rules={[
                { required: needsPairing, message: '请输入配对端口' },
                { type: 'number', min: 1024, max: 65535, message: '端口号必须在 1024-65535 范围内' }
              ]}
            >
              <InputNumber 
                placeholder="5556" 
                style={{ width: '100%' }} 
                min={1024} 
                max={65535}
              />
            </Form.Item>

            <Form.Item
              label="配对码"
              name="pairCode"
              rules={[
                { required: needsPairing, message: '请输入配对码' },
                { len: 6, message: '配对码应为 6 位数字' },
                { pattern: /^\d{6}$/, message: '配对码只能包含数字' }
              ]}
            >
              <Input 
                placeholder="123456"
                maxLength={6}
              />
            </Form.Item>
          </>
        )}

        <Form.Item style={{ marginTop: 24 }}>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading}
            icon={<WifiOutlined />}
            block
          >
            {needsPairing ? '配对并连接' : '连接无线调试'}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export interface DeviceConnectionGuideProps {
  type: 'usb' | 'wireless';
  expanded?: boolean;
}

/**
 * 设备连接指南组件
 */
export const DeviceConnectionGuide: React.FC<DeviceConnectionGuideProps> = ({
  type,
  expanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(expanded);

  const renderUSBGuide = () => (
    <Space direction="vertical">
      <Paragraph>
        <strong>USB 连接步骤：</strong>
      </Paragraph>
      <div style={{ paddingLeft: 16 }}>
        <Paragraph>1. 在手机设置中找到"关于手机"，连续点击"版本号"直到提示"已处于开发者模式"</Paragraph>
        <Paragraph>2. 返回设置 → 开发者选项，开启"USB 调试"</Paragraph>
        <Paragraph>3. 使用数据线连接手机和电脑</Paragraph>
        <Paragraph>4. 手机会弹出授权提示，选择"始终允许"</Paragraph>
        <Paragraph>5. 如果没有弹窗，尝试重新插拔数据线或重启 ADB 服务</Paragraph>
      </div>
    </Space>
  );

  const renderWirelessGuide = () => (
    <Space direction="vertical">
      <Paragraph>
        <strong>无线调试步骤：</strong>
      </Paragraph>
      <div style={{ paddingLeft: 16 }}>
        <Paragraph>1. 确保手机和电脑连接到同一个 WiFi 网络</Paragraph>
        <Paragraph>2. 在手机的开发者选项中开启"无线调试"</Paragraph>
        <Paragraph>3. 首次连接：点击"使用配对码配对设备"，记录 IP 地址、端口和配对码</Paragraph>
        <Paragraph>4. 后续连接：直接使用显示的 IP 地址和端口连接</Paragraph>
        <Paragraph>5. 如果连接失败，检查防火墙设置或尝试重新配对</Paragraph>
      </div>
    </Space>
  );

  const getIcon = () => type === 'usb' ? <UsbOutlined /> : <WifiOutlined />;
  const getTitle = () => type === 'usb' ? 'USB 连接指南' : '无线调试指南';

  return (
    <Card
      size="small"
      title={
        <Space>
          {getIcon()}
          <span>{getTitle()}</span>
        </Space>
      }
      extra={
        <Button
          type="text"
          size="small"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '收起' : '展开'}
        </Button>
      }
    >
      {isExpanded && (
        type === 'usb' ? renderUSBGuide() : renderWirelessGuide()
      )}
    </Card>
  );
};

export interface SettingsFormProps {
  rememberSettings: boolean;
  autoSkipCompleted: boolean;
  onSettingsChange: (settings: {
    rememberSettings: boolean;
    autoSkipCompleted: boolean;
  }) => void;
}

/**
 * 设置表单组件
 */
export const SettingsForm: React.FC<SettingsFormProps> = ({
  rememberSettings,
  autoSkipCompleted,
  onSettingsChange,
}) => {
  return (
    <Card
      title={
        <Space>
          <SettingOutlined />
          <span>向导设置</span>
        </Space>
      }
      size="small"
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text>记住设置</Text>
          <Switch
            checked={rememberSettings}
            onChange={(checked) => 
              onSettingsChange({ 
                rememberSettings: checked, 
                autoSkipCompleted 
              })
            }
          />
        </div>
        <Text type="secondary" style={{ fontSize: 12 }}>
          记住向导的步骤进度和配置信息
        </Text>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text>自动跳过已完成步骤</Text>
          <Switch
            checked={autoSkipCompleted}
            onChange={(checked) => 
              onSettingsChange({ 
                rememberSettings, 
                autoSkipCompleted: checked 
              })
            }
          />
        </div>
        <Text type="secondary" style={{ fontSize: 12 }}>
          自动跳过已验证完成的步骤
        </Text>
      </Space>
    </Card>
  );
};