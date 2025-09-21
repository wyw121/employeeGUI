/**
 * 统一可视化视图组件
 * 整合可视化页面分析、列表视图、层级树为一体
 */

import React, { useState, useEffect } from 'react';
import { 
  Modal, 
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
  Tooltip
} from 'antd';
import { 
  EyeOutlined,
  UnorderedListOutlined,
  BranchesOutlined,
  AppstoreOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { UIElement } from '../../api/universalUIAPI';
import { UIElementTree } from '../universal-ui/views/tree-view';
import './UnifiedVisualizationView.css';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Search } = Input;

interface UnifiedVisualizationViewProps {
  visible: boolean;
  onClose: () => void;
  elements: UIElement[];
  onElementSelect?: (element: UIElement) => void;
  onRefresh?: () => void;
}

interface ElementStats {
  total: number;
  interactive: number;
  grouped: Record<string, UIElement[]>;
}

export const UnifiedVisualizationView: React.FC<UnifiedVisualizationViewProps> = ({
  visible,
  onClose,
  elements = [],
  onElementSelect,
  onRefresh
}) => {
  const [searchText, setSearchText] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [activeView, setActiveView] = useState('visual'); // visual, list, tree

  // 元素统计
  const calculateStats = (): ElementStats => {
    const interactive = elements.filter(el => 
      el.is_clickable || el.checkable || el.is_scrollable
    ).length;

    const grouped = elements.reduce((acc: Record<string, UIElement[]>, element) => {
      const type = element.element_type || 'unknown';
      if (!acc[type]) acc[type] = [];
      acc[type].push(element);
      return acc;
    }, {});

    return {
      total: elements.length,
      interactive,
      grouped
    };
  };

  const stats = calculateStats();

  // 过滤元素
  const getFilteredElements = () => {
    let filtered = elements;

    // 按搜索文本过滤
    if (searchText) {
      filtered = filtered.filter(element =>
        element.text?.toLowerCase().includes(searchText.toLowerCase()) ||
        element.element_type?.toLowerCase().includes(searchText.toLowerCase()) ||
        element.resource_id?.toLowerCase().includes(searchText.toLowerCase()) ||
        element.content_desc?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // 按标签过滤
    if (selectedTab === 'interactive') {
      filtered = filtered.filter(el => el.is_clickable || el.checkable || el.is_scrollable);
    } else if (selectedTab !== 'all' && stats.grouped[selectedTab]) {
      filtered = stats.grouped[selectedTab];
    }

    return filtered;
  };

  const filteredElements = getFilteredElements();

  return (
    <Modal
      title={
        <Space>
          <EyeOutlined />
          <span>可视化视图</span>
          <Badge count={elements.length} style={{ backgroundColor: '#10b981' }} />
        </Space>
      }
      className="unified-visualization-view"
      visible={visible}
      onCancel={onClose}
      width={1400}
      style={{ top: 20 }}
      footer={[
        <Button key="refresh" icon={<ReloadOutlined />} onClick={onRefresh}>
          刷新数据
        </Button>,
        <Button key="close" onClick={onClose}>
          关闭
        </Button>
      ]}
    >
      <div style={{ background: 'linear-gradient(135deg, #111827, #1f2937)', padding: '24px', minHeight: '600px' }}>
        
        {/* 搜索和筛选区域 */}
        <Card 
          title={
            <Space>
              <SearchOutlined />
              <span>搜索与筛选</span>
            </Space>
          }
          style={{ marginBottom: '16px' }}
          size="small"
        >
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} md={12}>
              <Search
                placeholder="搜索元素文本、类型、ID..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onSearch={setSearchText}
                allowClear
              />
            </Col>
            <Col xs={24} md={12}>
              <Space wrap>
                {[
                  { key: 'all', label: '全部', count: stats.total, color: '#3b82f6' },
                  { key: 'interactive', label: '可交互', count: stats.interactive, color: '#10b981' },
                  ...Object.entries(stats.grouped).slice(0, 4).map(([type, items]) => ({
                    key: type,
                    label: type,
                    count: items.length,
                    color: '#8b5cf6'
                  }))
                ].map(tab => (
                  <Tag
                    key={tab.key}
                    color={selectedTab === tab.key ? tab.color : 'default'}
                    style={{
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: '12px'
                    }}
                    onClick={() => setSelectedTab(tab.key)}
                  >
                    {tab.label} ({tab.count})
                  </Tag>
                ))}
              </Space>
            </Col>
          </Row>
        </Card>

        {/* 视图切换标签页 */}
        <Tabs 
          activeKey={activeView} 
          onChange={setActiveView}
          type="card"
          style={{ 
            background: '#374151',
            borderRadius: '8px',
            padding: '8px 8px 0 8px'
          }}
        >
          {/* 可视化分析视图 */}
          <TabPane
            tab={
              <Space>
                <AppstoreOutlined />
                <span>可视化分析</span>
                <Badge count={filteredElements.length} size="small" />
              </Space>
            }
            key="visual"
          >
            <div style={{ 
              background: '#1f2937',
              borderRadius: '8px',
              padding: '16px',
              minHeight: '500px',
              display: 'flex',
              gap: '16px'
            }}>
              {/* 页面预览区域 */}
              <div style={{ flex: '0 0 400px' }}>
                <Card 
                  title="页面布局预览" 
                  size="small"
                  style={{ height: '100%' }}
                  bodyStyle={{ padding: '8px' }}
                >
                  <div style={{ 
                    width: '100%', 
                    height: '450px', 
                    background: '#374151',
                    borderRadius: '8px',
                    position: 'relative',
                    overflow: 'hidden',
                    border: '1px solid #4b5563'
                  }}>
                    {filteredElements.map((element, index) => {
                      const { left, top, right, bottom } = element.bounds;
                      const scale = 0.3; // 缩放比例
                      
                      return (
                        <Tooltip
                          key={element.id || index}
                          title={`${element.element_type}: ${element.text || '无文本'}`}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              left: left * scale,
                              top: top * scale,
                              width: (right - left) * scale,
                              height: (bottom - top) * scale,
                              background: element.is_clickable 
                                ? 'rgba(34, 197, 94, 0.3)' 
                                : 'rgba(156, 163, 175, 0.2)',
                              border: element.is_clickable 
                                ? '1px solid #22c55e' 
                                : '1px solid #6b7280',
                              borderRadius: '2px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onClick={() => onElementSelect?.(element)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = element.is_clickable 
                                ? 'rgba(34, 197, 94, 0.5)' 
                                : 'rgba(156, 163, 175, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = element.is_clickable 
                                ? 'rgba(34, 197, 94, 0.3)' 
                                : 'rgba(156, 163, 175, 0.2)';
                            }}
                          />
                        </Tooltip>
                      );
                    })}
                  </div>
                </Card>
              </div>

              {/* 元素信息区域 */}
              <div style={{ flex: 1 }}>
                <Card 
                  title="元素详情" 
                  size="small"
                  style={{ height: '100%' }}
                  bodyStyle={{ padding: '8px', maxHeight: '450px', overflowY: 'auto' }}
                >
                  <Row gutter={[8, 8]}>
                    {filteredElements.map((element, index) => (
                      <Col xs={24} sm={12} key={element.id || index}>
                        <Card
                          size="small"
                          hoverable
                          onClick={() => onElementSelect?.(element)}
                          style={{
                            cursor: 'pointer',
                            background: element.is_clickable 
                              ? 'linear-gradient(135deg, #065f46, #047857)'
                              : 'linear-gradient(135deg, #4b5563, #6b7280)'
                          }}
                          bodyStyle={{ padding: '8px' }}
                        >
                          <div>
                            <Text strong style={{ color: '#f9fafb', fontSize: '11px' }}>
                              {element.text || element.element_type}
                            </Text>
                            <br />
                            <Text style={{ fontSize: '10px', color: '#d1d5db' }}>
                              {element.bounds.left}, {element.bounds.top}
                            </Text>
                            <div style={{ marginTop: '4px' }}>
                              {element.is_clickable && <Tag color="green" style={{ fontSize: '9px' }}>点击</Tag>}
                              {element.checkable && <Tag color="blue" style={{ fontSize: '9px' }}>选择</Tag>}
                              {element.is_scrollable && <Tag color="purple" style={{ fontSize: '9px' }}>滚动</Tag>}
                            </div>
                          </div>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </Card>
              </div>
            </div>
          </TabPane>

          {/* 列表视图 */}
          <TabPane
            tab={
              <Space>
                <UnorderedListOutlined />
                <span>列表视图</span>
                <Badge count={filteredElements.length} size="small" />
              </Space>
            }
            key="list"
          >
            <div style={{ 
              background: '#1f2937',
              borderRadius: '8px',
              padding: '16px',
              minHeight: '500px',
              maxHeight: '600px',
              overflowY: 'auto'
            }}>
              <Row gutter={[8, 8]}>
                {filteredElements.map((element, index) => (
                  <Col xs={24} sm={12} md={8} lg={6} key={element.id || index}>
                    <Card
                      size="small"
                      hoverable
                      onClick={() => onElementSelect?.(element)}
                      style={{
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      bodyStyle={{ padding: '12px' }}
                    >
                      <div>
                        <Text strong style={{ color: '#f9fafb', fontSize: '12px' }}>
                          {element.text || element.element_type || '未知元素'}
                        </Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '11px', color: '#9ca3af' }}>
                          {element.element_type}
                        </Text>
                        <div style={{ marginTop: '8px' }}>
                          {element.is_clickable && <Tag color="green">可点击</Tag>}
                          {element.checkable && <Tag color="blue">可选择</Tag>}
                          {element.is_scrollable && <Tag color="purple">可滚动</Tag>}
                        </div>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          </TabPane>

          {/* 层级树视图 */}
          <TabPane
            tab={
              <Space>
                <BranchesOutlined />
                <span>层级树</span>
                <Badge count={filteredElements.length} size="small" />
              </Space>
            }
            key="tree"
          >
            <div style={{ 
              background: '#1f2937',
              borderRadius: '8px',
              padding: '16px',
              minHeight: '500px',
              maxHeight: '600px',
              overflowY: 'auto'
            }}>
              <UIElementTree
                elements={filteredElements}
                onElementSelect={onElementSelect}
              />
            </div>
          </TabPane>
        </Tabs>

        {/* 底部统计信息 */}
        <Card size="small" style={{ marginTop: '16px' }}>
          <Row gutter={[16, 8]} align="middle">
            <Col xs={12} md={6}>
              <Text style={{ color: '#e5e7eb' }}>
                <strong>总元素:</strong> {stats.total}
              </Text>
            </Col>
            <Col xs={12} md={6}>
              <Text style={{ color: '#e5e7eb' }}>
                <strong>可交互:</strong> {stats.interactive}
              </Text>
            </Col>
            <Col xs={12} md={6}>
              <Text style={{ color: '#e5e7eb' }}>
                <strong>已筛选:</strong> {filteredElements.length}
              </Text>
            </Col>
            <Col xs={12} md={6}>
              <Text style={{ color: '#e5e7eb' }}>
                <strong>当前视图:</strong> {
                  activeView === 'visual' ? '可视化分析' :
                  activeView === 'list' ? '列表视图' : '层级树'
                }
              </Text>
            </Col>
          </Row>
        </Card>
      </div>
    </Modal>
  );
};

export default UnifiedVisualizationView;