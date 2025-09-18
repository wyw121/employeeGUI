/**
 * 可视化视图主页
 * 整合可视化分析、列表视图、层级树为统一的主页面
 */

import React, { useState, useEffect } from 'react';
import { 
  Layout,
  Tabs, 
  Card,
  Space,
  Button,
  Input,
  Typography,
  Row,
  Col,
  Badge,
  Tag,
  Tooltip,
  Alert,
  Spin,
  message
} from 'antd';
import { 
  EyeOutlined,
  UnorderedListOutlined,
  BranchesOutlined,
  AppstoreOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  MobileOutlined,
  SettingOutlined,
  CloudDownloadOutlined
} from '@ant-design/icons';
import { useAdb } from '../application/hooks/useAdb';
import UniversalUIAPI, { UIElement } from '../api/universalUIAPI';
import { UIElementTree } from '../components/universal-ui/UIElementTree';
import './VisualizationViewPage.css';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Search } = Input;

interface ElementStats {
  total: number;
  interactive: number;
  grouped: Record<string, UIElement[]>;
}

const VisualizationViewPage: React.FC = () => {
  // 状态管理
  const { devices, selectedDevice, refreshDevices } = useAdb();
  const [elements, setElements] = useState<UIElement[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedElement, setSelectedElement] = useState<UIElement | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('visual');

  // 获取页面元素
  const fetchPageElements = async () => {
    if (!selectedDevice) {
      message.warning('请先连接设备');
      return;
    }

    setLoading(true);
    try {
      // 使用正确的API调用方式
      const xmlContent = await UniversalUIAPI.analyzeUniversalUIPage(selectedDevice.id);
      if (!xmlContent) {
        message.error('获取页面结构失败');
        return;
      }

      const elements = await UniversalUIAPI.extractPageElements(xmlContent);
      setElements(elements);
      message.success(`成功获取 ${elements.length} 个页面元素`);
    } catch (error) {
      console.error('获取页面元素失败:', error);
      message.error('获取页面元素失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 计算统计信息
  const stats: ElementStats = React.useMemo(() => {
    const interactive = elements.filter(el => el.is_clickable || el.checkable || el.is_scrollable).length;
    const grouped = elements.reduce((acc, el) => {
      const type = el.class_name || 'unknown';
      if (!acc[type]) acc[type] = [];
      acc[type].push(el);
      return acc;
    }, {} as Record<string, UIElement[]>);

    return {
      total: elements.length,
      interactive,
      grouped
    };
  }, [elements]);

  // 过滤元素
  const filteredElements = React.useMemo(() => {
    if (!searchTerm) return elements;
    return elements.filter(el => 
      el.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      el.class_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      el.resource_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [elements, searchTerm]);

  // 初始化时刷新设备
  useEffect(() => {
    refreshDevices();
  }, []);

  return (
    <div className="visualization-view-page">
      <Layout style={{ height: '100vh', overflow: 'hidden' }}>
        {/* 顶部标题栏 */}
        <Header className="page-header">
          <div className="header-content">
            <div className="header-left">
              <div className="logo-section">
                <EyeOutlined className="logo-icon" />
                <Title level={4} className="page-title">可视化视图</Title>
              </div>
              
              {selectedDevice && (
                <div className="device-info">
                  <Space>
                    {selectedDevice.status === 'online' ? (
                      <MobileOutlined className="device-icon" />
                    ) : (
                      <MobileOutlined className="device-icon-disabled" />
                    )}
                    <Text className="device-name">{selectedDevice.name}</Text>
                    <Badge 
                      status={selectedDevice.status === 'online' ? 'processing' : 'error'}
                      text={selectedDevice.status === 'online' ? '在线' : '离线'}
                    />
                  </Space>
                </div>
              )}
            </div>

            <div className="header-right">
              <Space>
                <Button 
                  type="primary" 
                  icon={<ReloadOutlined />}
                  onClick={fetchPageElements}
                  loading={loading}
                  disabled={!selectedDevice || selectedDevice.status !== 'online'}
                >
                  分析页面
                </Button>
                <Button icon={<SettingOutlined />}>
                  设置
                </Button>
              </Space>
            </div>
          </div>
        </Header>

        <Layout style={{ height: 'calc(100vh - 64px)' }}>
          {/* 侧边栏 */}
          <Sider width={320} className="page-sider">
            <div className="sider-content">
              {/* 搜索和筛选 */}
              <Card size="small" title="搜索筛选" className="search-card">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Search
                    placeholder="搜索元素..."
                    allowClear
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: '100%' }}
                  />
                  <div className="filter-tags">
                    <Tag color="blue">可点击</Tag>
                    <Tag color="green">可滚动</Tag>
                    <Tag color="purple">输入框</Tag>
                    <Tag color="orange">按钮</Tag>
                  </div>
                </Space>
              </Card>

              {/* 统计信息 */}
              <Card size="small" title="页面统计" className="stats-card">
                <Row gutter={[8, 8]}>
                  <Col span={12}>
                    <div className="stat-item">
                      <Title level={4} className="stat-number">{stats.total}</Title>
                      <Text className="stat-text">总元素</Text>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div className="stat-item">
                      <Title level={4} className="stat-number">{stats.interactive}</Title>
                      <Text className="stat-text">可交互</Text>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div className="stat-item">
                      <Title level={4} className="stat-number">{Object.keys(stats.grouped).length}</Title>
                      <Text className="stat-text">类型数</Text>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div className="stat-item">
                      <Title level={4} className="stat-number">{filteredElements.length}</Title>
                      <Text className="stat-text">筛选后</Text>
                    </div>
                  </Col>
                </Row>
              </Card>

              {/* 选中元素详情 */}
              {selectedElement && (
                <Card size="small" title="选中元素" className="selected-element-card">
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <div>
                      <Text strong>文本: </Text>
                      <Text>{selectedElement.text || '无'}</Text>
                    </div>
                    <div>
                      <Text strong>类名: </Text>
                      <Text>{selectedElement.class_name || '无'}</Text>
                    </div>
                    <div>
                      <Text strong>资源ID: </Text>
                      <Text>{selectedElement.resource_id || '无'}</Text>
                    </div>
                    <div>
                      <Space>
                        {selectedElement.is_clickable && <Tag color="blue">可点击</Tag>}
                        {selectedElement.is_scrollable && <Tag color="green">可滚动</Tag>}
                        {selectedElement.checkable && <Tag color="purple">可选择</Tag>}
                      </Space>
                    </div>
                  </Space>
                </Card>
              )}
            </div>
          </Sider>

          {/* 主内容区域 */}
          <Content className="page-content">
            {!selectedDevice ? (
              <div className="empty-container">
                <CloudDownloadOutlined style={{ fontSize: '64px', color: '#6b7280' }} />
                <Title level={3} style={{ color: '#6b7280' }}>未连接设备</Title>
                <Text style={{ color: '#9ca3af' }}>
                  请先连接Android设备以开始分析页面结构
                </Text>
                <Button 
                  type="primary" 
                  size="large" 
                  icon={<ReloadOutlined />}
                  onClick={refreshDevices}
                  style={{ marginTop: 16 }}
                >
                  刷新设备列表
                </Button>
              </div>
            ) : loading ? (
              <div className="loading-container">
                <Spin size="large" />
                <Title level={4} style={{ marginTop: 16, color: '#e5e7eb' }}>
                  正在分析页面结构...
                </Title>
                <Text style={{ color: '#9ca3af' }}>
                  这可能需要几秒钟时间，请稍候
                </Text>
              </div>
            ) : elements.length === 0 ? (
              <div className="empty-container">
                <AppstoreOutlined style={{ fontSize: '64px', color: '#6b7280' }} />
                <Title level={3} style={{ color: '#6b7280' }}>暂无页面数据</Title>
                <Text style={{ color: '#9ca3af' }}>
                  点击"分析页面"按钮开始获取当前页面的UI结构
                </Text>
              </div>
            ) : (
              <Tabs 
                activeKey={activeTab}
                onChange={setActiveTab}
                className="main-tabs"
                size="large"
              >
                <TabPane
                  tab={
                    <span>
                      <EyeOutlined />
                      可视化分析
                    </span>
                  }
                  key="visual"
                >
                  <div className="visual-view-container">
                    <Row gutter={[16, 16]} style={{ height: '100%' }}>
                      <Col span={12}>
                        <Card title="页面预览" className="preview-card" style={{ height: '100%' }}>
                          <div className="page-preview-container">
                            {filteredElements.map((element, index) => (
                              <Tooltip 
                                key={index}
                                title={`${element.class_name} - ${element.text || '无文本'}`}
                                placement="top"
                              >
                                <div
                                  className={`element-overlay ${
                                    element.is_clickable ? 'clickable-element' : 'non-clickable-element'
                                  }`}
                                  style={{
                                    position: 'absolute',
                                    left: `${(element.bounds.left / 1080) * 100}%`,
                                    top: `${(element.bounds.top / 1920) * 100}%`,
                                    width: `${((element.bounds.right - element.bounds.left) / 1080) * 100}%`,
                                    height: `${((element.bounds.bottom - element.bounds.top) / 1920) * 100}%`,
                                    cursor: element.is_clickable ? 'pointer' : 'default'
                                  }}
                                  onClick={() => setSelectedElement(element)}
                                />
                              </Tooltip>
                            ))}
                          </div>
                        </Card>
                      </Col>
                      <Col span={12}>
                        <Card title="元素详情" className="details-card" style={{ height: '100%' }}>
                          {selectedElement ? (
                            <div>
                              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                <div>
                                  <Title level={5}>基本信息</Title>
                                  <p><strong>文本:</strong> {selectedElement.text || '无'}</p>
                                  <p><strong>类名:</strong> {selectedElement.class_name}</p>
                                  <p><strong>资源ID:</strong> {selectedElement.resource_id || '无'}</p>
                                </div>
                                <div>
                                  <Title level={5}>位置与大小</Title>
                                  <p><strong>左:</strong> {selectedElement.bounds.left}px</p>
                                  <p><strong>顶:</strong> {selectedElement.bounds.top}px</p>
                                  <p><strong>右:</strong> {selectedElement.bounds.right}px</p>
                                  <p><strong>底:</strong> {selectedElement.bounds.bottom}px</p>
                                  <p><strong>宽度:</strong> {selectedElement.bounds.right - selectedElement.bounds.left}px</p>
                                  <p><strong>高度:</strong> {selectedElement.bounds.bottom - selectedElement.bounds.top}px</p>
                                </div>
                                <div>
                                  <Title level={5}>交互属性</Title>
                                  <Space wrap>
                                    <Tag color={selectedElement.is_clickable ? 'success' : 'default'}>
                                      {selectedElement.is_clickable ? '✓' : '✗'} 可点击
                                    </Tag>
                                    <Tag color={selectedElement.is_scrollable ? 'success' : 'default'}>
                                      {selectedElement.is_scrollable ? '✓' : '✗'} 可滚动
                                    </Tag>
                                    <Tag color={selectedElement.checkable ? 'success' : 'default'}>
                                      {selectedElement.checkable ? '✓' : '✗'} 可选择
                                    </Tag>
                                    <Tag color={selectedElement.is_enabled ? 'success' : 'error'}>
                                      {selectedElement.is_enabled ? '启用' : '禁用'}
                                    </Tag>
                                  </Space>
                                </div>
                              </Space>
                            </div>
                          ) : (
                            <div style={{ textAlign: 'center', padding: '40px' }}>
                              <AppstoreOutlined style={{ fontSize: '48px', color: '#6b7280' }} />
                              <p style={{ color: '#9ca3af', marginTop: 16 }}>
                                点击页面预览中的元素查看详细信息
                              </p>
                            </div>
                          )}
                        </Card>
                      </Col>
                    </Row>
                  </div>
                </TabPane>

                <TabPane
                  tab={
                    <span>
                      <UnorderedListOutlined />
                      列表视图
                    </span>
                  }
                  key="list"
                >
                  <div className="list-view-container">
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      {filteredElements.map((element, index) => (
                        <Card 
                          key={index}
                          size="small"
                          className={`list-item-card ${selectedElement === element ? 'selected' : ''}`}
                          hoverable
                          onClick={() => setSelectedElement(element)}
                        >
                          <Row>
                            <Col span={16}>
                              <Space direction="vertical" size="small">
                                <Text strong>{element.text || element.class_name || '未知元素'}</Text>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                  {element.resource_id || '无资源ID'}
                                </Text>
                              </Space>
                            </Col>
                            <Col span={8} style={{ textAlign: 'right' }}>
                              <Space>
                                {element.is_clickable && <Tag color="blue">点击</Tag>}
                                {element.is_scrollable && <Tag color="green">滚动</Tag>}
                                {element.checkable && <Tag color="purple">选择</Tag>}
                              </Space>
                              <br />
                              <Text type="secondary" style={{ fontSize: '11px' }}>
                                {element.bounds.right - element.bounds.left}×{element.bounds.bottom - element.bounds.top}
                              </Text>
                            </Col>
                          </Row>
                        </Card>
                      ))}
                    </Space>
                  </div>
                </TabPane>

                <TabPane
                  tab={
                    <span>
                      <BranchesOutlined />
                      层级树
                    </span>
                  }
                  key="tree"
                >
                  <div className="tree-view-container">
                    <UIElementTree 
                      elements={filteredElements}
                      selectedElementId={selectedElement?.id}
                      onElementSelect={(element) => setSelectedElement(element)}
                    />
                  </div>
                </TabPane>
              </Tabs>
            )}
          </Content>
        </Layout>
      </Layout>
    </div>
  );
};

export default VisualizationViewPage;