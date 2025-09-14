import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Tooltip,
  Modal,
  Descriptions,
  Typography,
  Row,
  Col,
  Alert,
  Badge,
  Dropdown,
  Menu,
  notification
} from 'antd';
import {
  MobileOutlined,
  WifiOutlined,
  UsbOutlined,
  DesktopOutlined,
  ReloadOutlined,
  DisconnectOutlined,
  InfoCircleOutlined,
  MoreOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined
} from '@ant-design/icons';
import { AdbService, AdbDevice } from '../../services/adbService';

const { Title, Text } = Typography;

interface DeviceDetailsModalProps {
  device: AdbDevice | null;
  visible: boolean;
  onClose: () => void;
}

const DeviceDetailsModal: React.FC<DeviceDetailsModalProps> = ({ device, visible, onClose }) => {
  const [deviceInfo, setDeviceInfo] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && device) {
      loadDeviceInfo();
    }
  }, [visible, device]);

  const loadDeviceInfo = async () => {
    if (!device) return;
    
    setLoading(true);
    try {
      const adbService = AdbService.getInstance();
      const info = await adbService.getDeviceInfo(device.id);
      setDeviceInfo(info);
    } catch (error) {
      notification.error({
        message: '获取设备信息失败',
        description: error instanceof Error ? error.message : '未知错误'
      });
    } finally {
      setLoading(false);
    }
  };

  const getImportantProps = (info: Record<string, string>) => {
    return {
      '设备型号': info['ro.product.model'] || '未知',
      '品牌': info['ro.product.brand'] || '未知',
      '制造商': info['ro.product.manufacturer'] || '未知',
      'Android版本': info['ro.build.version.release'] || '未知',
      'API级别': info['ro.build.version.sdk'] || '未知',
      'CPU架构': info['ro.product.cpu.abi'] || '未知',
      '序列号': info['ro.serialno'] || device?.id || '未知',
      '构建版本': info['ro.build.display.id'] || '未知'
    };
  };

  return (
    <Modal
      title={
        <Space>
          <MobileOutlined />
          设备详细信息
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="refresh" icon={<ReloadOutlined />} onClick={loadDeviceInfo} loading={loading}>
          刷新
        </Button>,
        <Button key="close" onClick={onClose}>
          关闭
        </Button>
      ]}
      width={800}
    >
      {device && (
        <>
          <Descriptions title="基本信息" bordered column={2} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="设备ID">{device.id}</Descriptions.Item>
            <Descriptions.Item label="连接状态">
              <Badge 
                status={device.status === 'device' ? 'success' : 'error'} 
                text={device.status} 
              />
            </Descriptions.Item>
            <Descriptions.Item label="连接类型">
              <Tag icon={
                device.type === 'usb' ? <UsbOutlined /> :
                device.type === 'wifi' ? <WifiOutlined /> :
                <DesktopOutlined />
              }>
                {device.type === 'usb' ? 'USB连接' :
                 device.type === 'wifi' ? 'WiFi连接' :
                 '模拟器'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="最后连接">
              {device.lastSeen.toLocaleString()}
            </Descriptions.Item>
          </Descriptions>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <SyncOutlined spin /> 正在获取设备详细信息...
            </div>
          ) : deviceInfo ? (
            <Descriptions title="设备属性" bordered column={1} size="small">
              {Object.entries(getImportantProps(deviceInfo)).map(([key, value]) => (
                <Descriptions.Item key={key} label={key}>
                  <Text copyable={typeof value === 'string'}>{value}</Text>
                </Descriptions.Item>
              ))}
            </Descriptions>
          ) : (
            <Alert
              message="无法获取设备详细信息"
              description="设备可能未正确连接或权限不足"
              type="warning"
              showIcon
            />
          )}
        </>
      )}
    </Modal>
  );
};

/**
 * 智能设备管理器组件
 * 为客户提供直观的设备管理界面
 */
export const SmartDeviceManager: React.FC = () => {
  const [devices, setDevices] = useState<AdbDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<AdbDevice | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const adbService = AdbService.getInstance();

  // 加载设备列表
  const loadDevices = async () => {
    setLoading(true);
    try {
      const deviceList = await adbService.getDevices(); // 获取设备列表
      setDevices(deviceList);
      
      if (deviceList.length === 0) {
        notification.info({
          message: '未发现设备',
          description: '请确保设备已连接并启用USB调试，或启动Android模拟器',
          duration: 3
        });
      }
    } catch (error) {
      notification.error({
        message: '获取设备列表失败',
        description: error instanceof Error ? error.message : '未知错误',
        duration: 4
      });
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadDevices();
  }, []);

  // 断开设备连接
  const disconnectDevice = async (device: AdbDevice) => {
    try {
      const success = await adbService.disconnectDevice(device.id);
      if (success) {
        notification.success({
          message: '设备已断开',
          description: `设备 ${device.id} 已成功断开连接`
        });
        await loadDevices(); // 刷新列表
      } else {
        notification.error({
          message: '断开连接失败',
          description: '无法断开设备连接'
        });
      }
    } catch (error) {
      notification.error({
        message: '断开连接失败',
        description: error instanceof Error ? error.message : '未知错误'
      });
    }
  };

  // 连接常见模拟器端口
  const connectEmulators = async () => {
    setLoading(true);
    try {
      const connectedDevices = await adbService.connectToCommonLdPlayerPorts();
      
      if (connectedDevices.length > 0) {
        notification.success({
          message: '模拟器连接成功',
          description: `成功连接 ${connectedDevices.length} 个模拟器实例`
        });
      } else {
        notification.warning({
          message: '未找到模拟器',
          description: '请确保雷电模拟器或其他Android模拟器正在运行'
        });
      }
      
      await loadDevices(); // 刷新设备列表
    } catch (error) {
      notification.error({
        message: '连接模拟器失败',
        description: error instanceof Error ? error.message : '未知错误'
      });
    } finally {
      setLoading(false);
    }
  };

  // 查看设备详情
  const showDeviceDetails = (device: AdbDevice) => {
    setSelectedDevice(device);
    setDetailModalVisible(true);
  };

  // 表格列定义
  const columns = [
    {
      title: '设备信息',
      key: 'device',
      render: (record: AdbDevice) => (
        <Space>
          {record.type === 'usb' && <UsbOutlined style={{ color: '#52c41a' }} />}
          {record.type === 'wifi' && <WifiOutlined style={{ color: '#1890ff' }} />}
          {record.type === 'emulator' && <DesktopOutlined style={{ color: '#722ed1' }} />}
          
          <div>
            <Text strong>{record.id}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.model && `型号: ${record.model}`}
              {record.product && ` | 产品: ${record.product}`}
            </Text>
          </div>
        </Space>
      )
    },
    {
      title: '连接状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusConfig = {
          device: { color: 'success', icon: <CheckCircleOutlined />, text: '已连接' },
          offline: { color: 'default', icon: <ExclamationCircleOutlined />, text: '离线' },
          unauthorized: { color: 'warning', icon: <ExclamationCircleOutlined />, text: '未授权' }
        };
        
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.offline;
        
        return (
          <Badge
            status={config.color as any}
            text={
              <Space>
                {config.icon}
                {config.text}
              </Space>
            }
          />
        );
      }
    },
    {
      title: '连接类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeConfig = {
          usb: { color: 'green', text: 'USB连接' },
          wifi: { color: 'blue', text: 'WiFi连接' },
          emulator: { color: 'purple', text: '模拟器' }
        };
        
        const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.usb;
        
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: '最后连接',
      dataIndex: 'lastSeen',
      key: 'lastSeen',
      render: (date: Date) => (
        <Tooltip title={date.toLocaleString()}>
          <Text type="secondary">
            {new Date().getTime() - date.getTime() < 60000 ? '刚刚' : date.toLocaleTimeString()}
          </Text>
        </Tooltip>
      )
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: AdbDevice) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'details',
                icon: <InfoCircleOutlined />,
                label: '查看详情',
                onClick: () => showDeviceDetails(record)
              },
              {
                key: 'disconnect',
                icon: <DisconnectOutlined />,
                label: '断开连接',
                disabled: record.status !== 'device',
                onClick: () => disconnectDevice(record)
              }
            ]
          }}
          trigger={['click']}
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      )
    }
  ];

  return (
    <div style={{ padding: '0 16px' }}>
      {/* 头部操作栏 */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space>
            <Title level={4} style={{ margin: 0 }}>
              <MobileOutlined /> 设备管理器
            </Title>
            <Badge count={devices.filter(d => d.status === 'device').length} showZero>
              <Tag>在线设备</Tag>
            </Badge>
          </Space>
        </Col>
        <Col>
          <Space>
            <Button
              icon={<DesktopOutlined />}
              onClick={connectEmulators}
              loading={loading}
            >
              连接模拟器
            </Button>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={loadDevices}
              loading={loading}
            >
              刷新设备
            </Button>
          </Space>
        </Col>
      </Row>

      {/* 设备列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={devices}
          rowKey="id"
          loading={loading}
          pagination={false}
          locale={{
            emptyText: (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <MobileOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                <div>
                  <Text type="secondary">暂无连接的设备</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    请连接Android设备或启动模拟器，然后点击刷新设备
                  </Text>
                </div>
              </div>
            )
          }}
          size="middle"
        />

        {/* 底部提示 */}
        {devices.length > 0 && (
          <Alert
            style={{ marginTop: 16 }}
            message="设备管理提示"
            description={
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>只有状态为"已连接"的设备才能进行自动化操作</li>
                <li>USB连接的设备速度更快，WiFi连接可能有延迟</li>
                <li>模拟器设备适合测试，但可能与实际设备行为有差异</li>
                <li>如果设备显示"未授权"，请在设备上确认USB调试授权</li>
              </ul>
            }
            type="info"
            showIcon
          />
        )}
      </Card>

      {/* 设备详情弹窗 */}
      <DeviceDetailsModal
        device={selectedDevice}
        visible={detailModalVisible}
        onClose={() => {
          setDetailModalVisible(false);
          setSelectedDevice(null);
        }}
      />
    </div>
  );
};

export default SmartDeviceManager;