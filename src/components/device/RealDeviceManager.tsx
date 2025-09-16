import React, { useEffect, useState } from 'react';
import {
    Alert,
    Avatar,
    Badge,
    Button,
    Card,
    Input,
    Modal,
    Space,
    Table,
    Tag,
    Tooltip,
    Typography,
} from 'antd';
import {
    CheckCircleOutlined,
    DisconnectOutlined,
    MobileOutlined,
    PlayCircleOutlined,
    PlusOutlined,
    SettingOutlined,
    SyncOutlined,
} from '@ant-design/icons';
import { useAdb } from '../../application/hooks/useAdb';
import { Device } from '../../domain/adb';

const { Text } = Typography;

interface DeviceManagerProps {
  onDeviceSelect?: (deviceId: string) => void;
  selectedDevice?: string;
}

export const RealDeviceManager: React.FC<DeviceManagerProps> = ({
  onDeviceSelect,
}) => {
  // 使用全局设备状态
  // 使用新的统一ADB状态
  const { 
    devices, 
    selectedDevice: globalSelectedDevice, 
    isLoading: deviceLoading, 
    refreshDevices, 
    selectDevice: setSelectedDevice, 
    // 注意：connectToDevice, disconnectDevice 在新架构中可能有不同的实现
    initialize: initializeAdb 
  } = useAdb();
  
  // 本地状态只保留模态框相关
  const [connectModalVisible, setConnectModalVisible] = useState(false);
  const [connectAddress, setConnectAddress] = useState('127.0.0.1:5555');

  // 初始化
  useEffect(() => {
    const init = async () => {
      await initializeAdb();
      await refreshDevices();
    };
    init();
  }, [initializeAdb, refreshDevices]);

  // 处理设备选择
  const handleDeviceSelect = (deviceId: string) => {
    setSelectedDevice(deviceId);
    onDeviceSelect?.(deviceId);
  };

  // 处理连接新设备
  const handleConnect = async () => {
    // TODO: 在新架构中实现设备连接功能
    // const success = await connectToDevice(connectAddress);
    console.warn('设备连接功能需要在新架构中实现');
    const success = false;
    if (success) {
      setConnectModalVisible(false);
      setConnectAddress('127.0.0.1:5555');
    }
  };

  // 处理断开连接
  const handleDisconnect = async (deviceId: string) => {
    // TODO: 在新架构中实现设备断开功能
    // await disconnectDevice(deviceId);
    console.warn('设备断开功能需要在新架构中实现');
  };

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            style={{ background: 'linear-gradient(135deg, #4facfe, #00f2fe)' }}
          >
            <MobileOutlined style={{ color: 'white' }} />
          </div>
          <div>
            <Typography.Title level={2} style={{ margin: 0 }}>
              设备管理
            </Typography.Title>
            <Text type="secondary">管理ADB连接的Android设备</Text>
          </div>
        </div>

        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setConnectModalVisible(true)}
          >
            连接设备
          </Button>
          <Button
            icon={<SyncOutlined />}
            onClick={refreshDevices}
            loading={deviceLoading}
          >
            刷新列表
          </Button>
        </Space>
      </div>

      {/* 设备统计 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <Text type="secondary">总设备数</Text>
              <div className="text-2xl font-bold text-blue-500">
                {devices.length}
              </div>
            </div>
            <MobileOutlined className="text-3xl text-blue-500" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <Text type="secondary">在线设备</Text>
              <div className="text-2xl font-bold text-green-500">
                {devices.filter(d => d.status === 'online').length}
              </div>
            </div>
            <CheckCircleOutlined className="text-3xl text-green-500" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <Text type="secondary">模拟器</Text>
              <div className="text-2xl font-bold text-purple-500">
                {devices.filter(d => d.isEmulator).length}
              </div>
            </div>
            <SettingOutlined className="text-3xl text-purple-500" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <Text type="secondary">当前选中</Text>
              <div className="text-2xl font-bold text-orange-500">
                {globalSelectedDevice ? '1' : '0'}
              </div>
            </div>
            <PlayCircleOutlined className="text-3xl text-orange-500" />
          </div>
        </Card>
      </div>

      {/* 设备列表 */}
      <Card title="设备列表" extra={
        <Badge count={devices.length} style={{ backgroundColor: '#52c41a' }}>
          <Text>已连接设备</Text>
        </Badge>
      }>
        {devices.length === 0 ? (
          <Alert
            message="未检测到设备"
            description="请确保设备已连接并开启USB调试，或点击'连接设备'手动添加。"
            type="info"
            showIcon
            action={
              <Button
                size="small"
                type="primary"
                onClick={() => setConnectModalVisible(true)}
              >
                连接设备
              </Button>
            }
          />
        ) : (
          <div>设备列表将在这里显示</div>
        )}
      </Card>

      {/* 连接设备模态框 */}
      <Modal
        title="连接设备"
        open={connectModalVisible}
        onOk={handleConnect}
        onCancel={() => setConnectModalVisible(false)}
        okText="连接"
        cancelText="取消"
      >
        <div className="space-y-4">
          <div>
            <Text strong>设备地址:</Text>
            <Input
              value={connectAddress}
              onChange={(e) => setConnectAddress(e.target.value)}
              placeholder="例如: 127.0.0.1:5555"
              className="mt-2"
            />
          </div>
          <Alert
            message="提示"
            description="请输入设备的IP地址和端口，通常模拟器使用 127.0.0.1:5555"
            type="info"
            showIcon
          />
        </div>
      </Modal>
    </div>
  );
};

export default RealDeviceManager;

