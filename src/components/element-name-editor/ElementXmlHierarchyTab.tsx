/**
 * 元素 XML 层级树 Tab 组件
 * 显示步骤元素对应的原始 XML 页面层级结构
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, 
  Alert, 
  Spin, 
  Button, 
  Space, 
  Tag, 
  Typography, 
  Row, 
  Col,
  Tree,
  Collapse,
  Tooltip,
  message
} from 'antd';
import {
  BranchesOutlined,
  ReloadOutlined,
  FileTextOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  SearchOutlined,
  ExpandAltOutlined
} from '@ant-design/icons';
import type { UIElement } from '../../api/universalUIAPI';
import type { CachedXmlPage, XmlPageContent } from '../../services/XmlPageCacheService';
import { XmlPageCacheService } from '../../services/XmlPageCacheService';
import { EnhancedXmlCacheService } from '../../services/EnhancedXmlCacheService';
import { UIElementTree } from '../universal-ui/views';

const { Text, Title } = Typography;
const { Panel } = Collapse;

interface ElementXmlHierarchyTabProps {
  /** 当前元素信息 */
  element: UIElement;
  /** 是否可见 */
  visible?: boolean;
}

interface ElementSource {
  /** 找到匹配的缓存页面 */
  cachedPage?: CachedXmlPage;
  /** 页面内容 */
  pageContent?: XmlPageContent;
  /** 匹配的元素在页面中的索引 */
  elementIndex?: number;
  /** 匹配置信度 */
  matchConfidence?: number;
}

export const ElementXmlHierarchyTab: React.FC<ElementXmlHierarchyTabProps> = ({
  element,
  visible = true
}) => {
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [elementSource, setElementSource] = useState<ElementSource | null>(null);
  const [cachedPages, setCachedPages] = useState<CachedXmlPage[]>([]);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'tree' | 'raw'>('tree');
  const [error, setError] = useState<string | null>(null);

  // 初始化时加载缓存页面
  useEffect(() => {
    if (visible) {
      loadCachedPagesAndFindSource();
    }
  }, [visible, element]);

  /**
   * 加载缓存页面并查找元素来源
   */
  const loadCachedPagesAndFindSource = async () => {
    if (!element) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // 获取所有缓存页面
      const pages = await XmlPageCacheService.getCachedPages();
      setCachedPages(pages);
      
      if (pages.length === 0) {
        setError('没有找到XML缓存页面，请先使用"Universal UI智能页面查找"分析页面');
        return;
      }

      // 尝试找到元素的原始XML页面
      const foundSource = await findElementSourcePage(element, pages);
      setElementSource(foundSource);
      
      if (!foundSource.cachedPage) {
        console.log('⚠️ 未找到元素的原始XML页面，将显示最新页面作为参考');
        // 如果没找到精确匹配，加载最新的页面作为参考
        const latestPage = pages[0];
        const latestContent = await XmlPageCacheService.loadPageContent(latestPage);
        setElementSource({
          cachedPage: latestPage,
          pageContent: latestContent,
          matchConfidence: 0
        });
      }
      
    } catch (error) {
      console.error('❌ 加载XML层级结构失败:', error);
      setError(`加载失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 查找元素的原始XML页面
   */
  const findElementSourcePage = async (
    targetElement: UIElement, 
    pages: CachedXmlPage[]
  ): Promise<ElementSource> => {
    let bestMatch: ElementSource = {};
    let bestScore = 0;

    // 遍历缓存页面，寻找最佳匹配
    for (let i = 0; i < Math.min(pages.length, 5); i++) { // 只检查最近的5个页面
      const page = pages[i];
      
      try {
        console.log(`🔍 检查页面: ${page.pageTitle}`);
        
        const pageContent = await XmlPageCacheService.loadPageContent(page);
        
        // 在页面元素中查找匹配的元素
        const matchResult = findBestElementMatch(targetElement, pageContent.elements);
        
        if (matchResult.score > bestScore) {
          bestScore = matchResult.score;
          bestMatch = {
            cachedPage: page,
            pageContent,
            elementIndex: matchResult.index,
            matchConfidence: matchResult.score
          };
          
          console.log(`✅ 找到更好的匹配: ${page.pageTitle} (置信度: ${matchResult.score})`);
        }
        
        // 如果找到了高置信度匹配，可以提前结束
        if (matchResult.score > 0.8) {
          console.log('🎯 找到高置信度匹配，停止搜索');
          break;
        }
        
      } catch (error) {
        console.warn(`⚠️ 检查页面 ${page.fileName} 时出错:`, error);
      }
    }

    return bestMatch;
  };

  /**
   * 在页面元素中找到最佳匹配的元素
   */
  const findBestElementMatch = (targetElement: UIElement, pageElements: any[]): {
    index: number;
    score: number;
  } => {
    let bestScore = 0;
    let bestIndex = -1;

    pageElements.forEach((element, index) => {
      const score = calculateElementSimilarity(targetElement, element);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });

    return { index: bestIndex, score: bestScore };
  };

  /**
   * 计算两个元素的相似度
   */
  const calculateElementSimilarity = (element1: UIElement, element2: any): number => {
    let score = 0;
    let factors = 0;

    // 文本匹配 (权重: 40%)
    if (element1.text && element2.text) {
      factors += 0.4;
      if (element1.text === element2.text) {
        score += 0.4;
      } else if (element1.text.includes(element2.text) || element2.text.includes(element1.text)) {
        score += 0.2;
      }
    }

    // resource_id 匹配 (权重: 30%)
    if (element1.resource_id && element2.resource_id) {
      factors += 0.3;
      if (element1.resource_id === element2.resource_id) {
        score += 0.3;
      }
    }

    // 元素类型匹配 (权重: 20%)
    if (element1.element_type && element2.element_type) {
      factors += 0.2;
      if (element1.element_type === element2.element_type) {
        score += 0.2;
      }
    }

    // 可点击性匹配 (权重: 10%)
    if (element1.is_clickable !== undefined && element2.is_clickable !== undefined) {
      factors += 0.1;
      if (element1.is_clickable === element2.is_clickable) {
        score += 0.1;
      }
    }

    // 如果没有任何可比较的因素，返回0
    if (factors === 0) return 0;

    return score / factors;
  };

  /**
   * 切换到不同的缓存页面
   */
  const handleSwitchPage = async (pageIndex: number) => {
    if (pageIndex >= cachedPages.length) return;
    
    setLoading(true);
    try {
      const page = cachedPages[pageIndex];
      const content = await XmlPageCacheService.loadPageContent(page);
      
      setElementSource({
        cachedPage: page,
        pageContent: content,
        matchConfidence: 0 // 手动选择的页面，置信度设为0
      });
      setSelectedPageIndex(pageIndex);
      
    } catch (error) {
      console.error('❌ 切换页面失败:', error);
      message.error('切换页面失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 渲染页面选择器
   */
  const renderPageSelector = () => {
    if (cachedPages.length === 0) return null;

    return (
      <Card size="small" title={
        <Space>
          <FileTextOutlined />
          XML页面选择 ({cachedPages.length} 个可用页面)
          {elementSource?.matchConfidence !== undefined && (
            <Tag color={
              elementSource.matchConfidence > 0.8 ? 'green' :
              elementSource.matchConfidence > 0.5 ? 'orange' : 'red'
            }>
              匹配度: {Math.round(elementSource.matchConfidence * 100)}%
            </Tag>
          )}
        </Space>
      }>
        <div className="space-y-3">
          {cachedPages.slice(0, 6).map((page, index) => (
            <div
              key={page.fileName}
              className={`p-3 border rounded cursor-pointer transition-colors ${
                selectedPageIndex === index ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-400'
              }`}
              onClick={() => handleSwitchPage(index)}
            >
              <Row justify="space-between" align="middle">
                <Col span={16}>
                  <Space direction="vertical" size="small">
                    <Space>
                      <Text strong>{page.pageTitle}</Text>
                      {selectedPageIndex === index && <Tag color="blue">当前</Tag>}
                      {elementSource?.cachedPage?.fileName === page.fileName && elementSource.matchConfidence! > 0.7 && (
                        <Tag color="green">智能匹配</Tag>
                      )}
                    </Space>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {page.deviceId} • {page.createdAt.toLocaleString()}
                    </Text>
                  </Space>
                </Col>
                <Col span={8} className="text-right">
                  <Space>
                    <Tag color="blue">{page.elementCount} 元素</Tag>
                    <Tag color="green">{page.clickableCount} 可点击</Tag>
                  </Space>
                </Col>
              </Row>
            </div>
          ))}
        </div>
      </Card>
    );
  };

  /**
   * 渲染层级树视图
   */
  const renderHierarchyTree = () => {
    if (!elementSource?.pageContent) return null;

    const { elements } = elementSource.pageContent;
    
    // 转换为UIElement格式供UIElementTree使用
    const uiElements: UIElement[] = elements.map((el, index) => ({
      id: `element_${index}`,
      element_type: el.element_type || 'View',
      text: el.text || '',
      bounds: el.bounds || { left: 0, top: 0, right: 0, bottom: 0 },
      xpath: '',
      resource_id: el.resource_id || '',
      class_name: el.class_name || '',
      is_clickable: Boolean(el.is_clickable),
      is_scrollable: Boolean(el.is_scrollable),
      is_enabled: Boolean(el.is_enabled),
      is_focused: Boolean(el.is_focused),
      checkable: Boolean(el.checkable),
      checked: Boolean(el.checked),
      selected: Boolean(el.selected),
      password: Boolean(el.password),
      content_desc: el.content_desc || ''
    }));

    // 找到匹配的元素
    const matchedElements = elementSource.elementIndex !== undefined 
      ? [uiElements[elementSource.elementIndex]]
      : [];

    return (
      <Card 
        size="small"
        title={
          <Space>
            <BranchesOutlined />
            XML层级结构
            <Tag color="blue">{elements.length} 个元素</Tag>
            {matchedElements.length > 0 && (
              <Tag color="green">已定位目标元素</Tag>
            )}
          </Space>
        }
        extra={
          <Space>
            <Button
              size="small"
              icon={<EyeOutlined />}
              type={viewMode === 'tree' ? 'primary' : 'default'}
              onClick={() => setViewMode('tree')}
            >
              树形视图
            </Button>
            <Button
              size="small"
              icon={<FileTextOutlined />}
              type={viewMode === 'raw' ? 'primary' : 'default'}
              onClick={() => setViewMode('raw')}
            >
              原始数据
            </Button>
          </Space>
        }
      >
        {viewMode === 'tree' ? (
          <div style={{ height: '400px', overflow: 'auto' }}>
            <UIElementTree
              elements={uiElements}
              selectedElements={matchedElements}
              onElementSelect={(selected) => {
                console.log('🎯 选中元素:', selected);
              }}
              searchable={true}
              expandAll={false}
              showStats={true}
            />
          </div>
        ) : (
          <div style={{ height: '400px', overflow: 'auto' }}>
            <pre style={{ 
              fontSize: '11px', 
              background: '#f5f5f5', 
              padding: '12px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }}>
              {JSON.stringify(elements, null, 2)}
            </pre>
          </div>
        )}
      </Card>
    );
  };

  /**
   * 渲染元素匹配信息
   */
  const renderMatchInfo = () => {
    if (!elementSource || !element) return null;

    const { cachedPage, matchConfidence, elementIndex } = elementSource;
    
    return (
      <Card size="small" title={
        <Space>
          <InfoCircleOutlined />
          匹配信息
        </Space>
      }>
        <Row gutter={16}>
          <Col span={12}>
            <div className="space-y-2">
              <div>
                <Text type="secondary">目标元素:</Text>
                <br />
                <Text strong>{element.text || element.resource_id || element.element_type}</Text>
              </div>
              <div>
                <Text type="secondary">元素类型:</Text>
                <br />
                <Tag color="blue">{element.element_type}</Tag>
              </div>
              {element.resource_id && (
                <div>
                  <Text type="secondary">资源ID:</Text>
                  <br />
                  <Text code>{element.resource_id}</Text>
                </div>
              )}
            </div>
          </Col>
          <Col span={12}>
            <div className="space-y-2">
              <div>
                <Text type="secondary">来源页面:</Text>
                <br />
                <Text strong>{cachedPage?.pageTitle || '未知'}</Text>
              </div>
              <div>
                <Text type="secondary">匹配置信度:</Text>
                <br />
                <Tag color={
                  (matchConfidence || 0) > 0.8 ? 'green' :
                  (matchConfidence || 0) > 0.5 ? 'orange' : 'red'
                }>
                  {Math.round((matchConfidence || 0) * 100)}%
                </Tag>
              </div>
              {elementIndex !== undefined && (
                <div>
                  <Text type="secondary">在页面中的位置:</Text>
                  <br />
                  <Text>第 {elementIndex + 1} 个元素</Text>
                </div>
              )}
            </div>
          </Col>
        </Row>
      </Card>
    );
  };

  // 主渲染
  if (!visible) return null;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>
          <Text>正在加载XML层级结构...</Text>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="加载失败"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={loadCachedPagesAndFindSource}>
            重试
          </Button>
        }
      />
    );
  }

  if (cachedPages.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <BranchesOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
        <div style={{ marginTop: '16px' }}>
          <Title level={4} type="secondary">没有XML缓存数据</Title>
          <Text type="secondary">
            请先使用"Universal UI智能页面查找"功能分析页面，
            <br />
            系统会自动缓存页面的XML结构数据
          </Text>
        </div>
        <Button 
          type="primary" 
          style={{ marginTop: '16px' }}
          onClick={loadCachedPagesAndFindSource}
        >
          刷新检查
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 功能说明 */}
      <Alert
        message="XML层级结构查看"
        description="显示当前元素在原始Android界面XML中的完整层级关系，帮助理解元素的上下文位置。系统会智能匹配元素来源页面。"
        type="info"
        showIcon
        style={{ marginBottom: '16px' }}
      />

      {/* 匹配信息 */}
      {renderMatchInfo()}

      {/* 页面选择器 */}
      <Collapse defaultActiveKey={['pages']} size="small">
        <Panel 
          header={`页面选择 (${cachedPages.length} 个可用)`} 
          key="pages"
          extra={
            <Button 
              size="small" 
              icon={<ReloadOutlined />} 
              onClick={loadCachedPagesAndFindSource}
            >
              刷新
            </Button>
          }
        >
          {renderPageSelector()}
        </Panel>
      </Collapse>

      {/* 层级树视图 */}
      {renderHierarchyTree()}
    </div>
  );
};

export default ElementXmlHierarchyTab;