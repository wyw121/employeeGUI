/**
 * 统一视图演示页面
 * 展示如何使用统一视图系统
 */

import React, { useState } from 'react';
import { Card, Button, Space, Divider, Alert, Typography, Table, Tag } from 'antd';
import { FileSearchOutlined, DatabaseOutlined, LinkOutlined } from '@ant-design/icons';
import UnifiedViewContainer from '../components/UnifiedViewContainer';
import { useUnifiedView } from '../hooks/useUnifiedView';
import { CachedXmlPage } from '../services/XmlPageCacheService';

const { Title, Paragraph, Text } = Typography;

const UnifiedViewDemo: React.FC = () => {
  const { unifiedData, viewState, actions, stats } = useUnifiedView();
  const [demoPage, setDemoPage] = useState<CachedXmlPage | null>(null);

  // 创建演示数据
  const createDemoPage = (): CachedXmlPage => {
    return {
      filePath: '/demo/ui_dump_demo.xml',
      absoluteFilePath: '/demo/ui_dump_demo.xml',
      fileName: 'ui_dump_demo.xml',
      deviceId: 'demo-device',
      timestamp: new Date().toISOString(),
      pageTitle: '演示页面',
      appPackage: 'com.demo.app',
      pageType: 'activity',
      elementCount: 15,
      clickableCount: 8,
      fileSize: 2048,
      createdAt: new Date(),
      description: '这是一个用于演示统一视图系统的示例页面',
      preview: {
        mainTexts: ['欢迎使用', '统一视图系统', '演示页面'],
        mainButtons: ['开始', '设置', '帮助'],
        inputCount: 2
      }
    };
  };

  // 加载演示数据
  const loadDemoData = async () => {
    const demo = createDemoPage();
    setDemoPage(demo);
    
    try {
      await actions.loadPage(demo);
    } catch (error) {
      console.error('加载演示数据失败:', error);
    }
  };

  // 统计数据表格列定义
  const statsColumns = [
    {
      title: '指标',
      dataIndex: 'metric',
      key: 'metric'
    },
    {
      title: '数值',
      dataIndex: 'value',
      key: 'value',
      render: (value: any) => <Tag color="blue">{value}</Tag>
    },
    {
      title: '说明',
      dataIndex: 'description',
      key: 'description'
    }
  ];

  // 构建统计数据
  const statsData = [
    {
      key: 'total',
      metric: '总元素数',
      value: stats.total,
      description: '页面中所有UI元素的总数'
    },
    {
      key: 'filtered',
      metric: '过滤后',
      value: stats.filtered,
      description: '应用过滤条件后显示的元素数'
    },
    {
      key: 'clickable',
      metric: '可点击',
      value: stats.clickable,
      description: '具有点击交互能力的元素数'
    },
    {
      key: 'selected',
      metric: '已选中',
      value: stats.selected,
      description: '当前选中的元素数'
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <LinkOutlined /> 统一视图系统演示
      </Title>
      
      <Paragraph>
        这个演示展示了如何使用统一视图系统来管理和联动三个不同的UI视图（树形、可视化、列表）。
        系统通过中央化的数据管理和增强缓存来消除重复数据处理，提高性能和用户体验。
      </Paragraph>

      <Alert
        message="架构优势"
        description="统一视图系统通过 UnifiedViewDataManager 实现了一次数据处理，多视图共享的架构，彻底解决了原来三个视图各自重复计算相同数据的性能问题。"
        type="info"
        showIcon
        style={{ marginBottom: '24px' }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* 左侧：操作面板 */}
        <Card title={<><DatabaseOutlined /> 数据操作</>} size="small">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button 
              type="primary" 
              block 
              onClick={loadDemoData}
              icon={<FileSearchOutlined />}
            >
              加载演示数据
            </Button>
            
            <Button 
              block 
              onClick={actions.refresh}
              disabled={!unifiedData}
              loading={viewState.loading}
            >
              刷新数据
            </Button>
            
            <Button 
              block 
              onClick={actions.clear}
              disabled={!unifiedData}
            >
              清除数据
            </Button>
          </Space>

          <Divider />

          <div>
            <Text strong>当前状态:</Text>
            <ul style={{ marginTop: '8px', fontSize: '12px' }}>
              <li>活跃视图: <Tag>{viewState.activeView}</Tag></li>
              <li>搜索词: <Tag>{viewState.searchTerm || '无'}</Tag></li>
              <li>加载中: <Tag color={viewState.loading ? 'orange' : 'green'}>{viewState.loading ? '是' : '否'}</Tag></li>
              <li>选中元素: <Tag>{viewState.selectedElement ? viewState.selectedElement.displayName : '无'}</Tag></li>
            </ul>
          </div>
        </Card>

        {/* 右侧：统计面板 */}
        <Card title="统计信息" size="small">
          {unifiedData ? (
            <>
              <Table
                dataSource={statsData}
                columns={statsColumns}
                size="small"
                pagination={false}
                style={{ marginBottom: '16px' }}
              />
              
              <div>
                <Text strong>按类型分布:</Text>
                <div style={{ marginTop: '8px' }}>
                  {Object.entries(stats.byType).map(([type, count]) => (
                    <Tag key={type} style={{ margin: '2px' }}>
                      {type}: {count}
                    </Tag>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              color: '#999', 
              padding: '40px 0' 
            }}>
              请先加载数据查看统计信息
            </div>
          )}
        </Card>
      </div>

      {/* 主要内容：统一视图容器 */}
      <Card title="统一视图容器" style={{ marginBottom: '24px' }}>
        <UnifiedViewContainer
          initialPage={demoPage}
          height="500px"
          showSidebar={true}
          showToolbar={true}
          onViewChange={(view) => {
            console.log(`演示页面：视图切换到 ${view}`);
          }}
          onElementSelect={(element) => {
            console.log(`演示页面：选中元素`, element);
          }}
        />
      </Card>

      {/* 技术说明 */}
      <Card title="技术实现说明" size="small">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <div>
            <Title level={5}>🏗️ 架构优势</Title>
            <ul style={{ fontSize: '12px' }}>
              <li>单一数据源管理</li>
              <li>统一的状态同步</li>
              <li>增强的缓存策略</li>
              <li>类型安全的接口</li>
            </ul>
          </div>
          
          <div>
            <Title level={5}>⚡ 性能提升</Title>
            <ul style={{ fontSize: '12px' }}>
              <li>消除重复计算</li>
              <li>持久化处理结果</li>
              <li>智能缓存更新</li>
              <li>按需数据加载</li>
            </ul>
          </div>
          
          <div>
            <Title level={5}>🔧 开发体验</Title>
            <ul style={{ fontSize: '12px' }}>
              <li>统一的Hook接口</li>
              <li>自动状态管理</li>
              <li>类型提示支持</li>
              <li>灵活的配置选项</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default UnifiedViewDemo;