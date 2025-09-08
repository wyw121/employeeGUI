import {
    CheckCircleOutlined,
    DisconnectOutlined,
    MobileOutlined,
    PlayCircleOutlined,
    PlusOutlined,
    SettingOutlined,
    SyncOutlined,
} from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';
import {
    Alert,
    Avatar,
    Badge,
    Button,
    Card,
    Input,
    message,
    Modal,
    Space,
    Table,
    Tag,
    Tooltip,
    Typography,
} from 'antd';
import React, { useCallback, useEffect, useState } from 'react';

const { Text } = Typography;

export interface RealDeviceInfo {
  id: string;
  name: string;
  status: 'device' | 'offline' | 'unauthorized' | 'connecting';
  model?: string;
  product?: string;
  platform?: string;
  lastActive?: string;
  isEmulator?: boolean;
  port?: number;
}

interface DeviceManagerProps {
  onDeviceSelect?: (deviceId: string) => void;
  selectedDevice?: string;
}

export const RealDeviceManager: React.FC<DeviceManagerProps> = ({
  onDeviceSelect,
  selectedDevice
}) => {
  const [devices, setDevices] = useState<RealDeviceInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectModalVisible, setConnectModalVisible] = useState(false);
  const [connectAddress, setConnectAddress] = useState('127.0.0.1:5555');
  const [adbPath, setAdbPath] = useState<string>('');

  // 初始化ADB路径
  const initializeAdb = useCallback(async () => {
    try {
      // 检测雷电模拟器ADB路径
      const detectedPath = await invoke<string | null>('detect_ldplayer_adb');
      if (detectedPath) {
        setAdbPath(detectedPath);
        message.success('已自动检测到雷电模拟器ADB路径');
      } else {
        setAdbPath('adb'); // 使用系统默认ADB
        message.info('未检测到雷电模拟器，将使用系统默认ADB');
      }
    } catch (error) {
      console.error('Initialize ADB failed:', error);
      setAdbPath('adb');
    }
  }, []);

  // 刷新设备列表
  const refreshDevices = useCallback(async () => {
    if (!adbPath) return;

    setLoading(true);
    setError(null);

    try {
      const output = await invoke<string>('get_adb_devices', { adbPath });
      const parsedDevices = parseDevicesOutput(output);
      setDevices(parsedDevices);
      
      if (parsedDevices.length > 0) {
        message.success(`检测到 ${parsedDevices.length} 个设备`);
      } else {
        message.info('未检测到连接的设备');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.toString() : '获取设备列表失败';
      setError(errorMsg);
      message.error(errorMsg);
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, [adbPath]);

  // 解析ADB设备输出
  const parseDevicesOutput = (output: string): RealDeviceInfo[] => {
    const lines = output.split('\n').filter(line => 
      line.trim() && !line.includes('List of devices')
    );

    return lines.map((line, index) => {
      const parts = line.trim().split(/\s+/);
      const deviceId = parts[0];
      const status = parts[1];

      // 检测是否为雷电模拟器
      const isEmulator = deviceId.includes('127.0.0.1') || deviceId.includes('emulator');
      const port = deviceId.includes(':') ? parseInt(deviceId.split(':')[1]) : undefined;

      // 解析设备信息
      let model = '';
      let product = '';
      
      for (let i = 2; i < parts.length; i++) {
        const part = parts[i];
        if (part.startsWith('model:')) {
          model = part.split(':')[1];
        } else if (part.startsWith('product:')) {
          product = part.split(':')[1];
        }
      }

      // 生成友好的设备名称
      let deviceName = '';
      if (isEmulator) {
        if (deviceId.includes('127.0.0.1')) {
          deviceName = `雷电模拟器 (${deviceId})`;
        } else {
          deviceName = `模拟器 (${deviceId})`;
        }
      } else {
        deviceName = model || product || `设备 ${index + 1}`;
      }

      return {
        id: deviceId,
        name: deviceName,
        status: status as RealDeviceInfo['status'],
        model,
        product,
        platform: isEmulator ? 'Android (模拟器)' : 'Android',
        lastActive: status === 'device' ? '刚刚' : '离线',
        isEmulator,
        port,
      };
    });
  };

  // 连接设备
  const connectToDevice = useCallback(async (address: string) => {
    if (!adbPath) {
      message.error('ADB路径未设置');
      return;
    }

    setLoading(true);
    try {
      const result = await invoke<string>('connect_adb_device', { 
        adbPath, 
        address 
      });
      
      if (result.includes('connected')) {
        message.success(`成功连接到设备: ${address}`);
        await refreshDevices();
        setConnectModalVisible(false);
      } else {
        message.error(`连接失败: ${result}`);
      }
    } catch (error) {
      message.error(`连接设备失败: ${error}`);
    } finally {
      setLoading(false);
    }
  }, [adbPath, refreshDevices]);

  // 断开设备
  const disconnectDevice = useCallback(async (deviceId: string) => {
    if (!adbPath) return;

    setLoading(true);
    try {
      await invoke<string>('disconnect_adb_device', { 
        adbPath, 
        address: deviceId 
      });
      message.success(`设备 ${deviceId} 已断开连接`);
      await refreshDevices();
    } catch (error) {
      message.error(`断开设备失败: ${error}`);
    } finally {
      setLoading(false);
    }
  }, [adbPath, refreshDevices]);

  // 连接常见雷电模拟器端口
  const connectToLdPlayer = useCallback(async () => {
    const commonPorts = [5555, 5556, 5557, 5558, 5559];
    let connected = false;
    
    for (const port of commonPorts) {
      try {
        await connectToDevice(`127.0.0.1:${port}`);
        connected = true;
        break;
      } catch (error) {
        // 记录错误但继续尝试下一个端口
        console.warn(`连接端口 ${port} 失败:`, error);
      }
    }
    
    if (!connected) {
      message.error('无法连接到雷电模拟器，请确保模拟器已启动');
    }
  }, [connectToDevice]);

  // 设备表格列定义
  const deviceColumns = [
    {
      title: '设备信息',
      key: 'device',
      render: (record: RealDeviceInfo) => (
        <Space>
          <Avatar 
            icon={<MobileOutlined />} 
            style={{ 
              backgroundColor: record.status === 'device' ? '#52c41a' : '#ff4d4f' 
            }} 
          />
          <div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>
              {record.name}
            </div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.id}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusConfig = {
          device: { color: 'success', text: '在线', icon: <CheckCircleOutlined /> },
          offline: { color: 'error', text: '离线', icon: <DisconnectOutlined /> },
          unauthorized: { color: 'warning', text: '未授权', icon: <SettingOutlined /> },
          connecting: { color: 'processing', text: '连接中', icon: <SyncOutlined spin /> },
        };
        
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.offline;
        
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '平台信息',
      dataIndex: 'platform',
      key: 'platform',
      render: (platform: string, record: RealDeviceInfo) => (
        <Space direction="vertical" size="small">
          <Text>{platform}</Text>
          {record.isEmulator && (
            <Badge 
              count="模拟器" 
              style={{ backgroundColor: '#722ed1', fontSize: '10px' }} 
            />
          )}
        </Space>
      ),
    },
    {
      title: '最后活跃',
      dataIndex: 'lastActive',
      key: 'lastActive',
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: RealDeviceInfo) => (
        <Space>
          <Tooltip title="选择此设备">
            <Button
              size="small"
              type={selectedDevice === record.id ? 'primary' : 'default'}
              icon={<CheckCircleOutlined />}
              onClick={() => onDeviceSelect?.(record.id)}
            >
              {selectedDevice === record.id ? '已选择' : '选择'}
            </Button>
          </Tooltip>
          
          {record.status === 'device' ? (
            <Button
              size="small"
              icon={<DisconnectOutlined />}
              onClick={() => disconnectDevice(record.id)}
              danger
            >
              断开
            </Button>
          ) : (
            <Button
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => connectToDevice(record.id)}
              type="primary"
            >
              连接
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // 初始化
  useEffect(() => {
    initializeAdb();
  }, [initializeAdb]);

  useEffect(() => {
    if (adbPath) {
      refreshDevices();
    }
  }, [adbPath, refreshDevices]);

  return (
    <Card
      title={
        <Space>
          <MobileOutlined />
          <span>设备管理中心</span>
          <Badge count={devices.filter(d => d.status === 'device').length} />
        </Space>
      }
      extra={
        <Space>
          <Button
            type="primary"
            icon={<SyncOutlined />}
            loading={loading}
            onClick={refreshDevices}
          >
            刷新设备
          </Button>
          <Button
            icon={<PlusOutlined />}
            onClick={() => setConnectModalVisible(true)}
          >
            连接设备
          </Button>
          <Button
            icon={<PlayCircleOutlined />}
            onClick={connectToLdPlayer}
            style={{ background: 'linear-gradient(135deg, #ff6b8a, #4ecdc4)' }}
          >
            连接雷电
          </Button>
        </Space>
      }
    >
      {error && (
        <Alert
          message="设备检测错误"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={() => setError(null)}>
              忽略
            </Button>
          }
        />
      )}

      {devices.length === 0 && !loading && (
        <Alert
          message="未检测到设备"
          description="请确保已启动雷电模拟器或连接Android设备，并启用ADB调试模式。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button 
              type="primary" 
              size="small" 
              onClick={connectToLdPlayer}
            >
              尝试连接雷电
            </Button>
          }
        />
      )}

      <Table
        dataSource={devices}
        columns={deviceColumns}
        rowKey="id"
        pagination={false}
        loading={loading}
        size="middle"
        locale={{
          emptyText: '暂无设备连接'
        }}
      />

      {/* 连接设备对话框 */}
      <Modal
        title="手动连接设备"
        open={connectModalVisible}
        onOk={() => connectToDevice(connectAddress)}
        onCancel={() => setConnectModalVisible(false)}
        confirmLoading={loading}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>请输入设备地址 (例如: 127.0.0.1:5555)</Text>
          <Input
            value={connectAddress}
            onChange={(e) => setConnectAddress(e.target.value)}
            placeholder="127.0.0.1:5555"
            prefix={<MobileOutlined />}
          />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            常用端口: 5555, 5556, 5557, 5558, 5559
          </Text>
        </Space>
      </Modal>
    </Card>
  );
};

export default RealDeviceManager;
