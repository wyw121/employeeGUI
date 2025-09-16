import { invoke } from '@tauri-apps/api/core';
import { Alert, Button, Card, Space, Typography } from 'antd';
import React, { useState } from 'react';

const { Title, Text, Paragraph } = Typography;

export const AdbPathTestPage: React.FC = () => {
  const [smartPath, setSmartPath] = useState<string>('');
  const [devices, setDevices] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const testSmartAdbPath = async () => {
    setLoading(true);
    setError('');
    try {
      const path = await invoke<string>('detect_smart_adb_path');
      setSmartPath(path);
      console.log('智能ADB路径检测结果:', path);
    } catch (err) {
      setError(`ADB路径检测失败: ${err}`);
      console.error('ADB路径检测失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const testDevices = async () => {
    if (!smartPath) {
      setError('请先检测ADB路径');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const output = await invoke<string>('get_adb_devices', { adbPath: smartPath });
      setDevices(output);
      console.log('设备检测结果:', output);
    } catch (err) {
      setError(`设备检测失败: ${err}`);
      console.error('设备检测失败:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>ADB路径检测测试</Title>
      
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card title="1. 智能ADB路径检测">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button 
              type="primary" 
              onClick={testSmartAdbPath}
              loading={loading}
            >
              检测智能ADB路径
            </Button>
            
            {smartPath && (
              <Alert 
                type="success" 
                message={`检测到ADB路径: ${smartPath}`}
              />
            )}
          </Space>
        </Card>

        <Card title="2. 设备检测测试">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button 
              type="primary" 
              onClick={testDevices}
              loading={loading}
              disabled={!smartPath}
            >
              检测连接的设备
            </Button>
            
            {devices && (
              <Alert 
                type="info" 
                message="设备检测结果"
                description={
                  <pre style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                    {devices}
                  </pre>
                }
              />
            )}
          </Space>
        </Card>

        {error && (
          <Alert type="error" message={error} />
        )}

        <Card title="环境信息">
          <Paragraph>
            <Text strong>当前环境:</Text> 开发环境 (npm run tauri dev)
          </Paragraph>
          <Paragraph>
            <Text strong>预期行为:</Text>
            <ul>
              <li>智能检测应该返回项目根目录下的 platform-tools/adb.exe</li>
              <li>设备检测应该能够列出连接的Android设备</li>
            </ul>
          </Paragraph>
        </Card>
      </Space>
    </div>
  );
};

export default AdbPathTestPage;