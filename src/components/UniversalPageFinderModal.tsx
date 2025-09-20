/**
 * Universal UI智能页面查找模态框
 * 重构版本 - 使用统一的DDD架构进行数据管理
 */

import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Button, 
  Select, 
  Card, 
  List, 
  Input, 
  Space, 
  Tag, 
  Typography, 
  Row, 
  Col,
  Tabs,
  Alert,
  Spin,
  message,
  Divider
} from 'antd';
import { 
  SearchOutlined, 
  ReloadOutlined, 
  MobileOutlined,
  EyeOutlined,
  FilterOutlined,
  BugOutlined,
  BranchesOutlined,
  UnorderedListOutlined,
  AppstoreOutlined
} from '@ant-design/icons';
import { useAdb } from '../application/hooks/useAdb';
import UnifiedViewContainer from './UnifiedViewContainer';
import './UniversalPageFinder.css';

const { Text, Title } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { Search } = Input;

interface UniversalPageFinderModalProps {
  visible: boolean;
  onClose: () => void;
  onElementSelect?: (element: any) => void;
}

const UniversalPageFinderModal: React.FC<UniversalPageFinderModalProps> = ({
  visible,
  onClose,
  onElementSelect
}) => {
  // 设备管理状态
  const { devices, selectedDevice, refreshDevices } = useAdb();
  
  // 本地状态
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [activeTab, setActiveTab] = useState('unified');

  // 初始化时刷新设备
  useEffect(() => {
    if (visible) {
      refreshDevices();
    }
  }, [visible, refreshDevices]);

  // 处理元素选择
  const handleElementSelect = (element: any) => {
    if (onElementSelect) {
      onElementSelect(element);
    }
    onClose();
    message.success('已选择元素');
  };

  // 渲染设备选择区域
  const renderDeviceSelection = () => (
    <Card size="small" title="设备选择" style={{ marginBottom: 16 }}>
      <Row gutter={[16, 16]} align="middle">
        <Col flex="auto">
          <Select
            placeholder="选择设备"
            style={{ width: '100%' }}
            value={selectedDevice?.id}
            loading={loading}
          >
            {devices.map(device => (
              <Option key={device.id} value={device.id}>
                <Space>
                  <MobileOutlined />
                  <span>{device.name}</span>
                  <Tag color={device.status === 'online' ? 'green' : 'red'}>
                    {device.status === 'online' ? '在线' : '离线'}
                  </Tag>
                </Space>
              </Option>
            ))}
          </Select>
        </Col>
        <Col>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={refreshDevices}
            loading={loading}
          >
            刷新
          </Button>
        </Col>
      </Row>
    </Card>
  );

  // 渲染搜索区域
  const renderSearchArea = () => (
    <Card size="small" title="搜索筛选" style={{ marginBottom: 16 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Search
          placeholder="搜索元素文本、类名、资源ID..."
          allowClear
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          style={{ width: '100%' }}
        />
        <div>
          <Space wrap>
            <Tag color="blue">可点击</Tag>
            <Tag color="green">可滚动</Tag>
            <Tag color="purple">输入框</Tag>
            <Tag color="orange">按钮</Tag>
            <Tag color="red">图像</Tag>
          </Space>
        </div>
      </Space>
    </Card>
  );

  return (
    <Modal
      title={
        <Space>
          <EyeOutlined />
          <span>智能页面元素查找器</span>
        </Space>
      }
      visible={visible}
      onCancel={onClose}
      width="90%"
      style={{ top: 20 }}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button key="help" type="default">
          帮助
        </Button>
      ]}
      className="universal-page-finder-modal"
    >
      <div className="finder-content">
        {/* 设备选择区域 */}
        {renderDeviceSelection()}

        {/* 搜索筛选区域 */}
        {renderSearchArea()}

        {/* 主要内容区域 */}
        {!selectedDevice ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <MobileOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
              <Title level={4} style={{ color: '#999' }}>
                请先选择设备
              </Title>
              <Text style={{ color: '#666' }}>
                请在上方选择一个已连接的Android设备
              </Text>
            </div>
          </Card>
        ) : (
          <Card>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                {
                  key: 'unified',
                  label: (
                    <span>
                      <AppstoreOutlined />
                      统一视图
                    </span>
                  ),
                  children: (
                    <div style={{ minHeight: '400px' }}>
                      <UnifiedViewContainer
                        showSidebar={false}
                        height="400px"
                        onElementSelect={handleElementSelect}
                      />
                    </div>
                  )
                },
                {
                  key: 'cached',
                  label: (
                    <span>
                      <BranchesOutlined />
                      缓存页面
                    </span>
                  ),
                  children: (
                    <Alert
                      message="缓存页面功能"
                      description="缓存页面分析功能正在开发中，敬请期待..."
                      type="info"
                      showIcon
                    />
                  )
                },
                {
                  key: 'advanced',
                  label: (
                    <span>
                      <BugOutlined />
                      高级选项
                    </span>
                  ),
                  children: (
                    <Alert
                      message="高级选项"
                      description="高级元素分析和调试功能正在开发中..."
                      type="info"
                      showIcon
                    />
                  )
                }
              ]}
            />
          </Card>
        )}
      </div>
    </Modal>
  );
};

export default UniversalPageFinderModal;