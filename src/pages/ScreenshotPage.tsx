import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Select, 
  Space, 
  Typography, 
  message, 
  Image, 
  Spin, 
  Alert,
  Row,
  Col,
  Divider,
  Tag
} from 'antd';
import { 
  CameraOutlined, 
  ReloadOutlined, 
  DownloadOutlined,
  MobileOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useAdb } from '../application/hooks/useAdb';
import { invoke } from '@tauri-apps/api/core';

const { Title, Text } = Typography;
const { Option } = Select;

interface ScreenshotResult {
  success: boolean;
  screenshot_path?: string;
  error?: string;
}

const ScreenshotPage: React.FC = () => {
  const {
    devices,
    selectedDevice,
    isLoading,
    isConnected,
    hasDevices,
    refreshDevices,
    selectDevice,
    initialize
  } = useAdb();

  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string>('');
  const [lastScreenshotPath, setLastScreenshotPath] = useState<string>('');

  // 自动初始化
  useEffect(() => {
    if (!isConnected) {
      initialize();
    }
  }, [isConnected, initialize]);

  // 获取设备截图
  const takeScreenshot = async () => {
    if (!selectedDevice) {
      message.warning('请先选择一个设备');
      return;
    }

    setScreenshotLoading(true);
    try {
      const result = await invoke('capture_device_screenshot', {
        deviceId: selectedDevice.id
      }) as ScreenshotResult;

      if (result.success && result.screenshot_path) {
        // 转换文件路径为可显示的URL
        const imageUrl = `file://${result.screenshot_path}`;
        setScreenshotUrl(imageUrl);
        setLastScreenshotPath(result.screenshot_path);
        message.success('截图成功！');
      } else {
        message.error(result.error || '截图失败');
      }
    } catch (error) {
      console.error('截图失败:', error);
      message.error(`截图失败: ${error}`);
    } finally {
      setScreenshotLoading(false);
    }
  };

  // 刷新设备列表
  const handleRefreshDevices = async () => {
    try {
      await refreshDevices();
      message.success('设备列表已刷新');
    } catch (error) {
      message.error('刷新设备列表失败');
    }
  };

  // 下载截图
  const downloadScreenshot = () => {
    if (lastScreenshotPath) {
      // 在系统文件管理器中打开截图文件夹
      invoke('show_in_folder', { path: lastScreenshotPath })
        .then(() => {
          message.info('已在文件管理器中打开截图位置');
        })
        .catch(() => {
          message.warning('无法打开文件位置，截图已保存到应用数据目录的screenshots文件夹中');
        });
    }
  };

  // 渲染设备状态指示器
  const renderDeviceStatus = (device: any) => {
    const isOnline = device.isOnline();
    return (
      <Space>
        <Tag color={isOnline ? 'green' : 'red'} icon={isOnline ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}>
          {isOnline ? '在线' : '离线'}
        </Tag>
        {device.getDisplayName()}
      </Space>
    );
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>
        <CameraOutlined /> ADB 设备截图工具
      </Title>
      
      <Row gutter={[24, 24]}>
        {/* 设备控制面板 */}
        <Col span={24}>
          <Card title="设备管理" size="small">
            <Space wrap>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={handleRefreshDevices}
                loading={isLoading}
              >
                刷新设备
              </Button>
              
              <Select
                placeholder="选择要截图的设备"
                style={{ minWidth: 300 }}
                value={selectedDevice?.id}
                onChange={selectDevice}
                loading={isLoading}
                dropdownRender={(menu) => (
                  <div>
                    {menu}
                    {!hasDevices && (
                      <div style={{ padding: '8px', textAlign: 'center', color: '#999' }}>
                        <MobileOutlined /> 没有检测到设备
                      </div>
                    )}
                  </div>
                )}
              >
                {devices.map((device) => (
                  <Option key={device.id} value={device.id}>
                    {renderDeviceStatus(device)}
                  </Option>
                ))}
              </Select>
              
              <Button 
                type="primary" 
                icon={<CameraOutlined />}
                onClick={takeScreenshot}
                loading={screenshotLoading}
                disabled={!selectedDevice || !selectedDevice.isOnline()}
              >
                截图
              </Button>

              {lastScreenshotPath && (
                <Button 
                  icon={<DownloadOutlined />}
                  onClick={downloadScreenshot}
                >
                  查看截图
                </Button>
              )}
            </Space>

            {/* 连接状态提示 */}
            <div style={{ marginTop: '16px' }}>
              {!isConnected && (
                <Alert 
                  message="ADB连接未建立" 
                  description="正在尝试连接ADB服务..." 
                  type="warning" 
                  showIcon 
                />
              )}
              
              {isConnected && !hasDevices && (
                <Alert 
                  message="没有检测到设备" 
                  description="请确保您的Android设备已连接并开启USB调试模式" 
                  type="info" 
                  showIcon 
                />
              )}
              
              {hasDevices && (
                <Alert 
                  message={`已检测到 ${devices.length} 个设备`}
                  description={`在线设备: ${devices.filter(d => d.isOnline()).length} 个`}
                  type="success" 
                  showIcon 
                />
              )}
            </div>
          </Card>
        </Col>

        {/* 截图显示区域 */}
        <Col span={24}>
          <Card title="截图预览" size="small">
            {screenshotLoading && (
              <div style={{ textAlign: 'center', padding: '60px' }}>
                <Spin size="large" />
                <div style={{ marginTop: '16px' }}>
                  <Text type="secondary">正在截图中...</Text>
                </div>
              </div>
            )}

            {screenshotUrl && !screenshotLoading && (
              <div style={{ textAlign: 'center' }}>
                <Image
                  src={screenshotUrl}
                  alt="设备截图"
                  style={{ maxWidth: '100%', maxHeight: '600px' }}
                  preview={{
                    mask: '点击查看大图'
                  }}
                />
                <Divider />
                <Space>
                  <Text type="secondary">
                    截图路径: {lastScreenshotPath}
                  </Text>
                </Space>
              </div>
            )}

            {!screenshotUrl && !screenshotLoading && (
              <div style={{ 
                textAlign: 'center', 
                padding: '60px',
                background: '#fafafa',
                border: '2px dashed #d9d9d9',
                borderRadius: '8px'
              }}>
                <CameraOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                <div style={{ marginTop: '16px' }}>
                  <Text type="secondary">选择设备并点击截图按钮开始</Text>
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 使用说明 */}
      <Card title="使用说明" size="small" style={{ marginTop: '24px' }}>
        <ol>
          <li>确保您的Android设备已通过USB连接到电脑</li>
          <li>在设备上开启"开发者选项"中的"USB调试"功能</li>
          <li>点击"刷新设备"按钮检测连接的设备</li>
          <li>从下拉列表中选择要截图的设备</li>
          <li>点击"截图"按钮获取设备屏幕截图</li>
          <li>截图将自动保存到应用数据目录的screenshots文件夹中</li>
        </ol>
      </Card>
    </div>
  );
};

export default ScreenshotPage;