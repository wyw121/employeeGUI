/**
 * 统一视图容器组件
 * 整合三个视图（树形、可视化、列表）并实现数据联动
 */

import React, { useState, useEffect } from 'react';
import { Layout, Card, Tabs, Input, Button, Space, Badge, Tooltip, message } from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  EyeOutlined,
  UnorderedListOutlined,
  NodeIndexOutlined,
  SettingOutlined,
  ClearOutlined
} from '@ant-design/icons';
import { useUnifiedView } from '../hooks/useUnifiedView';
import { CachedXmlPage } from '../services/XmlPageCacheService';

// 临时的简单组件实现（后续可以拆分为独立文件）
const ViewFilterPanel: React.FC<any> = ({ filters, onFiltersChange }) => (
  <div>过滤器面板 - 待实现</div>
);

const ViewStatsPanel: React.FC<any> = ({ stats }) => (
  <div>统计面板 - 元素总数: {stats.total}</div>
);

const TreeView: React.FC<any> = ({ treeData, filteredElements }) => (
  <div>树形视图 - {filteredElements.length} 个元素</div>
);

const VisualView: React.FC<any> = ({ visualData, filteredElements }) => (
  <div>可视化视图 - {filteredElements.length} 个元素</div>
);

const ListView: React.FC<any> = ({ listData, filteredElements }) => (
  <div>列表视图 - {filteredElements.length} 个元素</div>
);

const ElementDetailPanel: React.FC<any> = ({ element, onClose }) => (
  <div>
    <h4>{element.displayName}</h4>
    <button onClick={onClose}>关闭</button>
  </div>
);

const { Sider, Content } = Layout;
const { TabPane } = Tabs;
const { Search } = Input;

interface UnifiedViewContainerProps {
  // 初始加载的页面
  initialPage?: CachedXmlPage;
  // 是否显示侧边栏
  showSidebar?: boolean;
  // 是否显示工具栏
  showToolbar?: boolean;
  // 容器高度
  height?: string | number;
  // 自定义样式类
  className?: string;
  // 视图切换回调
  onViewChange?: (view: 'tree' | 'visual' | 'list') => void;
  // 元素选择回调
  onElementSelect?: (element: any) => void;
}

const UnifiedViewContainer: React.FC<UnifiedViewContainerProps> = ({
  initialPage,
  showSidebar = true,
  showToolbar = true,
  height = '600px',
  className = '',
  onViewChange,
  onElementSelect
}) => {
  const {
    unifiedData,
    filteredElements,
    viewState,
    actions,
    stats
  } = useUnifiedView();

  const [showFilters, setShowFilters] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 初始化加载
  useEffect(() => {
    if (initialPage) {
      actions.loadPage(initialPage).catch(error => {
        console.error('初始页面加载失败:', error);
      });
    }
  }, [initialPage, actions]);

  // 监听视图切换
  useEffect(() => {
    if (onViewChange) {
      onViewChange(viewState.activeView);
    }
  }, [viewState.activeView, onViewChange]);

  // 监听元素选择
  useEffect(() => {
    if (onElementSelect && viewState.selectedElement) {
      onElementSelect(viewState.selectedElement);
    }
  }, [viewState.selectedElement, onElementSelect]);

  // 渲染工具栏
  const renderToolbar = () => {
    if (!showToolbar) return null;

    return (
      <Card 
        size="small" 
        style={{ marginBottom: '12px' }}
        bodyStyle={{ padding: '8px 16px' }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          {/* 左侧搜索 */}
          <div style={{ flex: 1, minWidth: '200px', maxWidth: '400px' }}>
            <Search
              placeholder="搜索元素（名称、类型、文本内容...）"
              value={viewState.searchTerm}
              onChange={(e) => actions.search(e.target.value)}
              onSearch={actions.search}
              allowClear
              size="small"
            />
          </div>

          {/* 右侧操作按钮 */}
          <Space size="small">
            {/* 过滤器按钮 */}
            <Tooltip title="显示/隐藏过滤器">
              <Button
                icon={<FilterOutlined />}
                size="small"
                type={showFilters ? 'primary' : 'default'}
                onClick={() => setShowFilters(!showFilters)}
              >
                过滤器
              </Button>
            </Tooltip>

            {/* 刷新按钮 */}
            <Tooltip title="刷新当前页面 (Ctrl+R)">
              <Button
                icon={<ReloadOutlined />}
                size="small"
                onClick={actions.refresh}
                loading={viewState.loading}
                disabled={!unifiedData}
              >
                刷新
              </Button>
            </Tooltip>

            {/* 重新分析按钮 */}
            <Tooltip title="重新分析当前页面，丢弃缓存数据">
              <Button
                icon={<ReloadOutlined />}
                size="small"
                type="primary"
                ghost
                onClick={async () => {
                  try {
                    await actions.forceReanalyze();
                  } catch (error) {
                    console.error('重新分析失败:', error);
                  }
                }}
                loading={viewState.loading}
                disabled={!unifiedData}
              >
                重新分析
              </Button>
            </Tooltip>

            {/* 清除数据按钮 */}
            <Tooltip title="清除当前视图数据">
              <Button
                icon={<ClearOutlined />}
                size="small"
                onClick={() => {
                  actions.clear();
                  message.info('已清除当前数据');
                }}
              >
                清除数据
              </Button>
            </Tooltip>

            {/* 清除所有缓存按钮 */}
            <Tooltip title="清除所有缓存文件和内存数据">
              <Button
                icon={<ClearOutlined />}
                size="small"
                danger
                onClick={async () => {
                  try {
                    await actions.clearAllCache();
                  } catch (error) {
                    console.error('清除缓存失败:', error);
                  }
                }}
              >
                清除缓存
              </Button>
            </Tooltip>

            {/* 设置按钮 */}
            <Tooltip title="视图设置">
              <Button
                icon={<SettingOutlined />}
                size="small"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              >
                设置
              </Button>
            </Tooltip>
          </Space>
        </div>

        {/* 快捷统计信息 */}
        {unifiedData && (
          <div style={{ 
            marginTop: '8px', 
            fontSize: '12px', 
            color: '#666',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <span>总计: <Badge count={stats.total} color="blue" /></span>
            <span>已过滤: <Badge count={stats.filtered} color="green" /></span>
            <span>可点击: <Badge count={stats.clickable} color="orange" /></span>
            {viewState.selectedElement && (
              <span>已选中: <Badge count={1} color="red" /></span>
            )}
          </div>
        )}
      </Card>
    );
  };

  // 渲染过滤器面板
  const renderFilterPanel = () => {
    if (!showFilters || !unifiedData) return null;

    return (
      <Card 
        size="small" 
        title="过滤器" 
        style={{ marginBottom: '12px' }}
        extra={
          <Button 
            size="small" 
            type="link" 
            onClick={() => actions.updateFilters({
              elementTypes: [],
              interactionTypes: [],
              importance: [],
              onlyClickable: false,
              onlyWithText: false
            })}
          >
            重置
          </Button>
        }
      >
        <ViewFilterPanel
          filters={viewState.filters}
          onFiltersChange={actions.updateFilters}
          elementTypes={Object.keys(stats.byType)}
          stats={stats}
        />
      </Card>
    );
  };

  // 渲染视图内容
  const renderViewContent = () => {
    if (!unifiedData) {
      return (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: '200px',
          color: '#999',
          fontSize: '16px'
        }}>
          📱 请先加载页面数据
        </div>
      );
    }

    if (viewState.loading) {
      return (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: '200px',
          color: '#999',
          fontSize: '16px'
        }}>
          🔄 正在加载数据...
        </div>
      );
    }

    return (
      <Tabs
        activeKey={viewState.activeView}
        onChange={(key) => actions.switchView(key as 'tree' | 'visual' | 'list')}
        size="small"
        style={{ height: '100%' }}
        tabBarExtraContent={
          <div style={{ fontSize: '12px', color: '#666' }}>
            显示 {filteredElements.length} / {stats.total} 个元素
          </div>
        }
      >
        <TabPane
          tab={
            <span>
              <NodeIndexOutlined />
              层级树视图
            </span>
          }
          key="tree"
        >
          <TreeView
            treeData={unifiedData.treeViewData}
            filteredElements={filteredElements}
            selectedElement={viewState.selectedElement}
            onElementSelect={actions.selectElement}
            searchTerm={viewState.searchTerm}
          />
        </TabPane>

        <TabPane
          tab={
            <span>
              <EyeOutlined />
              可视化视图
            </span>
          }
          key="visual"
        >
          <VisualView
            visualData={unifiedData.visualViewData}
            filteredElements={filteredElements}
            selectedElement={viewState.selectedElement}
            onElementSelect={actions.selectElement}
            searchTerm={viewState.searchTerm}
          />
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
          <ListView
            listData={unifiedData.listViewData}
            filteredElements={filteredElements}
            selectedElement={viewState.selectedElement}
            onElementSelect={actions.selectElement}
            searchTerm={viewState.searchTerm}
          />
        </TabPane>
      </Tabs>
    );
  };

  // 渲染侧边栏
  const renderSidebar = () => {
    if (!showSidebar) return null;

    return (
      <Sider
        width={300}
        collapsed={sidebarCollapsed}
        collapsible
        trigger={null}
        style={{ 
          background: '#fff',
          borderLeft: '1px solid #f0f0f0'
        }}
      >
        <div style={{ padding: '16px', height: '100%', overflow: 'auto' }}>
          {!sidebarCollapsed && (
            <>
              {/* 统计面板 */}
              <ViewStatsPanel
                stats={stats}
                unifiedData={unifiedData}
                style={{ marginBottom: '16px' }}
              />

              {/* 选中元素详情 */}
              {viewState.selectedElement && (
                <ElementDetailPanel
                  element={viewState.selectedElement}
                  onClose={() => actions.selectElement(null)}
                />
              )}

              {/* 快捷操作 */}
              <Card size="small" title="快捷操作" style={{ marginTop: '16px' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button 
                    size="small" 
                    block
                    onClick={() => actions.updateFilters({ onlyClickable: !viewState.filters.onlyClickable })}
                    type={viewState.filters.onlyClickable ? 'primary' : 'default'}
                  >
                    {viewState.filters.onlyClickable ? '显示全部' : '只看可点击'}
                  </Button>
                  
                  <Button 
                    size="small" 
                    block
                    onClick={() => actions.updateFilters({ onlyWithText: !viewState.filters.onlyWithText })}
                    type={viewState.filters.onlyWithText ? 'primary' : 'default'}
                  >
                    {viewState.filters.onlyWithText ? '显示全部' : '只看有文本'}
                  </Button>
                  
                  <Button 
                    size="small" 
                    block
                    onClick={() => actions.search('')}
                    disabled={!viewState.searchTerm}
                  >
                    清除搜索
                  </Button>
                </Space>
              </Card>
            </>
          )}
        </div>
      </Sider>
    );
  };

  return (
    <div 
      className={`unified-view-container ${className}`}
      style={{ height }}
    >
      <Layout style={{ height: '100%' }}>
        <Content style={{ padding: '16px', overflow: 'auto' }}>
          {renderToolbar()}
          {renderFilterPanel()}
          
          <Card 
            bodyStyle={{ padding: '16px', height: 'calc(100% - 120px)' }}
            style={{ height: '100%' }}
          >
            {renderViewContent()}
          </Card>
        </Content>
        
        {renderSidebar()}
      </Layout>

      {/* 全局快捷键提示 */}
      {unifiedData && (
        <div style={{
          position: 'absolute',
          bottom: '8px',
          right: '8px',
          fontSize: '11px',
          color: '#999',
          background: 'rgba(255,255,255,0.9)',
          padding: '4px 8px',
          borderRadius: '4px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
        }}>
          快捷键: Ctrl+1/2/3 切换视图 | Ctrl+R 刷新 | ESC 取消选择
        </div>
      )}
    </div>
  );
};

export default UnifiedViewContainer;