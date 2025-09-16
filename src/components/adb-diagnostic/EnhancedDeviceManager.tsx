/**
 * 增强版设备管理组件
 * 支持设备详细信息、健康监控、批量操作等功能
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Tooltip,
  Progress,
  Drawer,
  Descriptions,
  Row,
  Col,
  Alert,
  message,
  Modal,
  Select,
  Typography,
  Badge,
  Statistic,
  Empty,
  Spin
} from 'antd';
import {
  ReloadOutlined,
  MobileOutlined,
  DisconnectOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ToolOutlined,
  BugOutlined,
  CameraOutlined,
  FileOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { ColumnsType } from 'antd/lib/table';
import { useAdb } from '../../application/hooks/useAdb';
import { useLogManager } from './hooks/useLogManager';
import { LogCategory } from '../../services/adb-diagnostic/LogManager';

const { Text, Title } = Typography;
const { Option } = Select;

interface DeviceInfo {
  id: string;
  status: 'device' | 'offline' | 'unauthorized' | 'no permissions';
  model?: string;
  product?: string;
  androidVersion?: string;
  apiLevel?: string;
  batteryLevel?: number;
  connectionType: 'usb' | 'wifi' | 'emulator';
  features: string[];
  lastSeen: Date;
  isHealthy: boolean;
  healthIssues: string[];
  properties?: Record<string, string>;
}

interface EnhancedDeviceManagerProps {
  className?: string;
  showHeader?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

/**
 * 设备状态映射
 */
const DEVICE_STATUS_CONFIG = {
  device: { color: 'success', icon: <CheckCircleOutlined />, text: '已连接' },
  offline: { color: 'default', icon: <CloseCircleOutlined />, text: '离线' },
  unauthorized: { color: 'warning', icon: <ExclamationCircleOutlined />, text: '未授权' },
  'no permissions': { color: 'error', icon: <CloseCircleOutlined />, text: '无权限' }
};

/**
 * 连接类型映射
 */
const CONNECTION_TYPE_CONFIG = {
  usb: { color: 'blue', text: 'USB' },
  wifi: { color: 'green', text: 'WiFi' },
  emulator: { color: 'orange', text: '模拟器' }
};

/**
 * 设备详情抽屉组件
 */
const DeviceDetailDrawer: React.FC<{
  visible: boolean;
  deviceId: string | null;
  onClose: () => void;
}> = ({ visible, deviceId, onClose }) => {
  const [deviceDetails, setDeviceDetails] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(false);
  const { getDeviceInfo } = useAdb();

  useEffect(() => {
    if (visible && deviceId) {
      fetchDeviceDetails();
    }
  }, [visible, deviceId]);

  const fetchDeviceDetails = async () => {
    if (!deviceId) return;
    
    setLoading(true);
    try {
      const details = await getDeviceInfo(deviceId);
      setDeviceDetails(details);
    } catch (error) {
      message.error('获取设备详情失败');
    } finally {
      setLoading(false);
    }
  };

  const getSystemInfo = () => {
    if (!deviceDetails) return {};
    
    return {
      model: deviceDetails['ro.product.model'] || '未知',
      brand: deviceDetails['ro.product.brand'] || '未知',
      manufacturer: deviceDetails['ro.product.manufacturer'] || '未知',
      androidVersion: deviceDetails['ro.build.version.release'] || '未知',
      apiLevel: deviceDetails['ro.build.version.sdk'] || '未知',
      buildId: deviceDetails['ro.build.id'] || '未知',
      fingerprint: deviceDetails['ro.build.fingerprint'] || '未知'
    };
  };

  const systemInfo = getSystemInfo();

  return (
    <Drawer
      title={`设备详情 - ${deviceId}`}
      width={600}
      onClose={onClose}
      visible={visible}
    >
      <Spin spinning={loading}>
        {deviceDetails ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            {/* 基本信息 */}
            <Card size="small" title="基本信息">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="设备ID">{deviceId}</Descriptions.Item>
                <Descriptions.Item label="型号">{systemInfo.model}</Descriptions.Item>
                <Descriptions.Item label="品牌">{systemInfo.brand}</Descriptions.Item>
                <Descriptions.Item label="制造商">{systemInfo.manufacturer}</Descriptions.Item>
                <Descriptions.Item label="Android版本">{systemInfo.androidVersion}</Descriptions.Item>
                <Descriptions.Item label="API级别">{systemInfo.apiLevel}</Descriptions.Item>
                <Descriptions.Item label="构建ID">{systemInfo.buildId}</Descriptions.Item>
              </Descriptions>
            </Card>

            {/* 系统属性 */}
            <Card size="small" title="系统属性" extra={
              <Button size="small" onClick={fetchDeviceDetails}>
                <ReloadOutlined />
              </Button>
            }>
              <div style={{ maxHeight: 300, overflow: 'auto' }}>
                {Object.entries(deviceDetails).map(([key, value]) => (
                  <div key={key} style={{ marginBottom: 4, fontSize: '12px' }}>
                    <Text code style={{ marginRight: 8 }}>{key}</Text>
                    <Text type="secondary">{value}</Text>
                  </div>
                ))}
              </div>
            </Card>
          </Space>
        ) : (
          <Empty description="无法获取设备详情" />
        )}
      </Spin>
    </Drawer>
  );
};

/**
 * 增强版设备管理器主组件
 */
export const EnhancedDeviceManager: React.FC<EnhancedDeviceManagerProps> = ({
  className,
  showHeader = true,
  autoRefresh = true,
  refreshInterval = 5000
}) => {
  const {
    devices,
    isLoading,
    lastError: error,
    refreshDevices,
    // Note: 这些方法可能需要从新架构中获取
    // connectToLdPlayer,
    // disconnectDevice,
    restartAdbServer
  } = useAdb();

  const { info, warn } = useLogManager();
  
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;

    const timer = setInterval(() => {
      refreshDevices();
    }, refreshInterval);

    return () => clearInterval(timer);
  }, [autoRefresh, refreshInterval, refreshDevices]);

  // 初始化时记录日志
  useEffect(() => {
    info(LogCategory.USER_ACTION, 'EnhancedDeviceManager', '设备管理器已加载');
  }, [info]);

  // 显示设备详情
  const showDeviceDetails = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    setDetailDrawerVisible(true);
    info(LogCategory.USER_ACTION, 'EnhancedDeviceManager', '查看设备详情', { deviceId });
  };

  // 断开设备连接
  const handleDisconnectDevice = async (deviceId: string) => {
    try {
      // TODO: 实现新架构中的断开连接功能
      // const success = await disconnectDevice(deviceId);
      const success = false; // 临时处理
      console.warn('断开连接功能待实现');
      if (success) {
        message.success(`设备 ${deviceId} 断开成功`);
        info(LogCategory.DEVICE, 'EnhancedDeviceManager', '设备断开成功', { deviceId });
      } else {
        message.error(`设备 ${deviceId} 断开失败`);
        warn(LogCategory.DEVICE, 'EnhancedDeviceManager', '设备断开失败', { deviceId });
      }
    } catch (error) {
      message.error('断开设备时发生错误');
      warn(LogCategory.DEVICE, 'EnhancedDeviceManager', '断开设备异常', { deviceId, error });
    }
  };

  // 连接到雷电模拟器
  const handleConnectLdPlayer = async () => {
    setIsConnecting(true);
    try {
      // TODO: 实现新架构中的LDPlayer连接功能
      // const success = await connectToLdPlayer();
      const success = false; // 临时处理
      console.warn('LDPlayer连接功能待实现');
      if (success) {
        message.success('雷电模拟器连接成功');
        info(LogCategory.DEVICE, 'EnhancedDeviceManager', '雷电模拟器连接成功');
      } else {
        message.warning('雷电模拟器连接失败，请检查模拟器状态');
        warn(LogCategory.DEVICE, 'EnhancedDeviceManager', '雷电模拟器连接失败');
      }
    } catch (error) {
      message.error('连接雷电模拟器时发生错误');
      warn(LogCategory.DEVICE, 'EnhancedDeviceManager', '连接雷电模拟器异常', { error });
    } finally {
      setIsConnecting(false);
    }
  };

  // 重启ADB服务器
  const handleRestartAdbServer = async () => {
    try {
      await restartAdbServer();
      message.success('ADB服务器重启成功');
      info(LogCategory.SYSTEM, 'EnhancedDeviceManager', 'ADB服务器重启成功');
    } catch (error) {
      message.error('重启ADB服务器时发生错误');
      warn(LogCategory.SYSTEM, 'EnhancedDeviceManager', 'ADB服务器重启异常', { error });
    }
  };

  // 批量断开设备
  const handleBatchDisconnect = () => {
    Modal.confirm({
      title: '批量断开设备',
      content: `确定要断开选中的 ${selectedRowKeys.length} 个设备吗？`,
      onOk: async () => {
        for (const deviceId of selectedRowKeys) {
          await handleDisconnectDevice(deviceId);
        }
        setSelectedRowKeys([]);
      }
    });
  };

  // 表格列定义
  const columns: ColumnsType<any> = [
    {
      title: '设备ID',
      dataIndex: 'id',
      width: 200,
      render: (id: string) => (
        <Text code style={{ fontSize: '12px' }}>{id}</Text>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: string) => {
        const config = DEVICE_STATUS_CONFIG[status as keyof typeof DEVICE_STATUS_CONFIG];
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      }
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 80,
      render: (type: string) => {
        const config = CONNECTION_TYPE_CONFIG[type as keyof typeof CONNECTION_TYPE_CONFIG];
        return (
          <Tag color={config.color}>{config.text}</Tag>
        );
      }
    },
    {
      title: '型号',
      dataIndex: 'model',
      width: 150,
      render: (model: string) => model || '未知'
    },
    {
      title: '最后连接',
      dataIndex: 'lastSeen',
      width: 150,
      render: (lastSeen: Date) => (
        <Text style={{ fontSize: '12px' }}>
          {lastSeen?.toLocaleString() || '未知'}
        </Text>
      )
    },
    {
      title: '操作',
      width: 200,
      render: (_, record) => (
        <Space>
          <Tooltip title="查看详情">
            <Button
              size="small"
              icon={<InfoCircleOutlined />}
              onClick={() => showDeviceDetails(record.id)}
            />
          </Tooltip>
          <Tooltip title="设备截图">
            <Button
              size="small"
              icon={<CameraOutlined />}
              disabled={record.status !== 'device'}
            />
          </Tooltip>
          <Tooltip title="文件管理">
            <Button
              size="small"
              icon={<FileOutlined />}
              disabled={record.status !== 'device'}
            />
          </Tooltip>
          <Tooltip title="断开连接">
            <Button
              size="small"
              danger
              icon={<DisconnectOutlined />}
              onClick={() => handleDisconnectDevice(record.id)}
              disabled={record.status === 'offline'}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  // 设备统计
  const deviceStats = {
    total: devices.length,
    online: devices.filter(d => d.status === 'online').length,
    offline: devices.filter(d => d.status === 'offline').length,
    unauthorized: devices.filter(d => d.status === 'unauthorized').length
  };

  return (
    <div className={className}>
      {showHeader && (
        <Card style={{ marginBottom: 16 }}>
          <Row align="middle" justify="space-between">
            <Col>
              <Title level={4} style={{ margin: 0 }}>
                <MobileOutlined style={{ marginRight: 8 }} />
                设备管理器
              </Title>
            </Col>
            <Col>
              <Space>
                <Statistic
                  title="在线"
                  value={deviceStats.online}
                  suffix={`/ ${deviceStats.total}`}
                  valueStyle={{ color: '#52c41a', fontSize: 16 }}
                />
              </Space>
            </Col>
          </Row>
        </Card>
      )}

      {/* 设备统计 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总设备数"
              value={deviceStats.total}
              prefix={<MobileOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="在线设备"
              value={deviceStats.online}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="离线设备"
              value={deviceStats.offline}
              valueStyle={{ color: '#999' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="未授权设备"
              value={deviceStats.unauthorized}
              valueStyle={{ color: '#faad14' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 操作工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                loading={isLoading}
                onClick={refreshDevices}
              >
                刷新设备
              </Button>
              <Button
                icon={<MobileOutlined />}
                loading={isConnecting}
                onClick={handleConnectLdPlayer}
              >
                连接雷电模拟器
              </Button>
              <Button
                icon={<ToolOutlined />}
                onClick={handleRestartAdbServer}
              >
                重启ADB服务
              </Button>
            </Space>
          </Col>
          <Col>
            {selectedRowKeys.length > 0 && (
              <Space>
                <Text>已选择 {selectedRowKeys.length} 个设备</Text>
                <Button
                  danger
                  size="small"
                  onClick={handleBatchDisconnect}
                >
                  批量断开
                </Button>
              </Space>
            )}
          </Col>
        </Row>
      </Card>

      {/* 错误提示 */}
      {error && (
        <Alert
          message="设备连接错误"
          description={error?.message || 'Unknown error'}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 设备列表 */}
      <Card>
        <Table
          dataSource={devices}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="small"
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys as string[]),
            getCheckboxProps: (record) => ({
              disabled: record.status === 'offline'
            })
          }}
          locale={{
            emptyText: (
              <Empty
                description="未发现设备"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button type="primary" onClick={handleConnectLdPlayer}>
                  连接设备
                </Button>
              </Empty>
            )
          }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 个设备，共 ${total} 个`,
            defaultPageSize: 20
          }}
        />
      </Card>

      {/* 设备详情抽屉 */}
      <DeviceDetailDrawer
        visible={detailDrawerVisible}
        deviceId={selectedDeviceId}
        onClose={() => setDetailDrawerVisible(false)}
      />
    </div>
  );
};