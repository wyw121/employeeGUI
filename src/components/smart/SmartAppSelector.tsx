import React, { useState, useEffect, useMemo } from 'react';
import { 
  Modal, 
  Input, 
  List, 
  Avatar, 
  Button, 
  Select, 
  Space, 
  Tag, 
  Empty,
  Spin,
  message,
  Typography,
  Row,
  Col,
  Card
} from 'antd';
import { 
  SearchOutlined, 
  AppstoreOutlined,
  AndroidOutlined,
  SettingOutlined,
  StarOutlined,
  RocketOutlined,
  CloseOutlined
} from '@ant-design/icons';
import type { AppInfo } from '../../types/smartComponents';
import { smartAppService } from '../../services/smartAppService';

const { Search } = Input;
const { Text } = Typography;
const { Option } = Select;

export interface SmartAppSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (app: AppInfo) => void;
  deviceId: string;
  selectedApp?: AppInfo | null;
}

export const SmartAppSelector: React.FC<SmartAppSelectorProps> = ({
  visible,
  onClose,
  onSelect,
  deviceId,
  selectedApp
}) => {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'user' | 'system'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('enabled');
  const [viewMode, setViewMode] = useState<'popular' | 'all' | 'search'>('popular');

  // 加载设备应用
  const loadDeviceApps = async () => {
    if (!deviceId) return;

    setLoading(true);
    try {
      const includeSystemApps = categoryFilter !== 'user';
      const deviceApps = await smartAppService.getDeviceApps(deviceId, includeSystemApps);
      setApps(deviceApps);
    } catch (error) {
      message.error('加载设备应用失败');
      console.error('加载设备应用失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载
  useEffect(() => {
    if (visible && deviceId) {
      loadDeviceApps();
    }
  }, [visible, deviceId, categoryFilter]);

  // 过滤和搜索应用
  const filteredApps = useMemo(() => {
    let result = [...apps];

    // 按类别过滤
    result = smartAppService.filterAppsByCategory(result, categoryFilter);
    
    // 按状态过滤
    result = smartAppService.filterAppsByStatus(result, statusFilter);

    // 搜索过滤
    if (searchQuery.trim()) {
      result = smartAppService.intelligentSearch(result, searchQuery);
    }

    // 根据视图模式排序
    if (viewMode === 'popular') {
      result = smartAppService.sortAppsByPopularity(result);
      // 只显示前20个热门应用
      result = result.slice(0, 20);
    } else {
      // 按应用名称排序
      result = result.sort((a, b) => a.app_name.localeCompare(b.app_name));
    }

    return result;
  }, [apps, categoryFilter, statusFilter, searchQuery, viewMode]);

  // 处理应用选择
  const handleSelectApp = (app: AppInfo) => {
    onSelect(app);
    onClose();
    message.success(`已选择应用: ${app.app_name}`);
  };

  // 获取应用图标
  const getAppIcon = (app: AppInfo) => {
    if (smartAppService.isPopularApp(app.package_name)) {
      return <StarOutlined style={{ color: '#faad14' }} />;
    }
    
    if (app.is_system_app) {
      return <SettingOutlined style={{ color: '#722ed1' }} />;
    }
    
    return <AppstoreOutlined style={{ color: '#1890ff' }} />;
  };

  // 快速选择热门应用
  const popularApps = useMemo(() => {
    return apps.filter(app => smartAppService.isPopularApp(app.package_name))
      .sort((a, b) => a.app_name.localeCompare(b.app_name))
      .slice(0, 8);
  }, [apps]);

  return (
    <Modal
      title={
        <Space>
          <RocketOutlined />
          智能应用选择器
          {selectedApp && (
            <Tag color="green">
              已选: {selectedApp.app_name}
            </Tag>
          )}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      style={{ top: 20 }}
      bodyStyle={{ maxHeight: '70vh', overflowY: 'auto' }}
    >
      {/* 搜索和过滤工具栏 */}
      <div style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Search
              placeholder="搜索应用名称或包名..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onSearch={(value) => setSearchQuery(value)}
              allowClear
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col span={4}>
            <Select
              style={{ width: '100%' }}
              value={viewMode}
              onChange={setViewMode}
              placeholder="视图模式"
            >
              <Option value="popular">热门应用</Option>
              <Option value="all">全部应用</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              style={{ width: '100%' }}
              value={categoryFilter}
              onChange={setCategoryFilter}
              placeholder="应用类型"
            >
              <Option value="all">全部</Option>
              <Option value="user">用户应用</Option>
              <Option value="system">系统应用</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="状态"
            >
              <Option value="all">全部</Option>
              <Option value="enabled">已启用</Option>
              <Option value="disabled">已禁用</Option>
            </Select>
          </Col>
        </Row>
      </div>

      {/* 快速选择热门应用 */}
      {viewMode === 'popular' && popularApps.length > 0 && (
        <Card 
          title="热门应用快捷选择" 
          size="small"
          style={{ marginBottom: 16 }}
          bodyStyle={{ padding: '12px' }}
        >
          <Row gutter={[8, 8]}>
            {popularApps.map((app) => (
              <Col span={6} key={app.package_name}>
                <Button
                  block
                  size="small"
                  icon={getAppIcon(app)}
                  onClick={() => handleSelectApp(app)}
                  style={{
                    height: 'auto',
                    whiteSpace: 'normal',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ fontSize: '12px', marginTop: '2px' }}>
                    {app.app_name}
                  </div>
                </Button>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* 应用列表 */}
      <Spin spinning={loading}>
        {filteredApps.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              searchQuery ? '没有找到匹配的应用' : '没有可用的应用'
            }
          />
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={filteredApps}
            style={{ maxHeight: '400px', overflowY: 'auto' }}
            renderItem={(app) => (
              <List.Item
                actions={[
                  <Button 
                    type="primary" 
                    size="small"
                    onClick={() => handleSelectApp(app)}
                  >
                    选择
                  </Button>
                ]}
                style={{
                  cursor: 'pointer',
                  backgroundColor: selectedApp?.package_name === app.package_name ? '#f0f8ff' : undefined
                }}
                onClick={() => handleSelectApp(app)}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar 
                      icon={getAppIcon(app)}
                      style={{
                        backgroundColor: app.is_system_app ? '#f5f5f5' : '#e6f7ff'
                      }}
                    />
                  }
                  title={
                    <Space>
                      <Text strong>{app.app_name}</Text>
                      {smartAppService.isPopularApp(app.package_name) && (
                        <Tag color="orange" icon={<StarOutlined />}>
                          热门
                        </Tag>
                      )}
                      {app.is_system_app && (
                        <Tag color="purple">
                          系统
                        </Tag>
                      )}
                      {!app.is_enabled && (
                        <Tag color="red">
                          已禁用
                        </Tag>
                      )}
                    </Space>
                  }
                  description={
                    <div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {app.package_name}
                      </Text>
                      {app.version_name && (
                        <Text type="secondary" style={{ fontSize: '12px', marginLeft: '8px' }}>
                          v{app.version_name}
                        </Text>
                      )}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Spin>

      {/* 底部统计信息 */}
      <div style={{ 
        marginTop: 16, 
        padding: '8px 0', 
        borderTop: '1px solid #f0f0f0',
        textAlign: 'center'
      }}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          共找到 {filteredApps.length} 个应用
          {searchQuery && ` (搜索: "${searchQuery}")`}
        </Text>
      </div>
    </Modal>
  );
};