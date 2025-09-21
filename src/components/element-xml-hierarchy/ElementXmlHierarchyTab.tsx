/**
 * 元素XML层级结构Tab - 主组件
 * 利用Universal UI的增强缓存数据显示元素的XML层级关系
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
  ExpandAltOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';

import type { UIElement } from '../../api/universalUIAPI';
import type { UIElement as ElementMapperUIElement } from '../../modules/ElementNameMapper';
import type { CachedXmlPage } from '../../services/XmlPageCacheService';
import { XmlPageCacheService } from '../../services/XmlPageCacheService';
import { EnhancedXmlCacheService, type CachedViewData } from '../../services/EnhancedXmlCacheService';
import type { UnifiedViewData, EnhancedUIElement } from '../../services/UnifiedViewDataManager';

import { ElementSourceFinder, PageSelector, HierarchyTreeViewer, ElementMatchInfo } from './';

const { Text, Title } = Typography;
const { Panel } = Collapse;

// 兼容的元素类型，支持两种UIElement定义
type CompatibleUIElement = UIElement | ElementMapperUIElement;

interface ElementXmlHierarchyTabProps {
  /** 当前步骤元素信息 */
  element: CompatibleUIElement;
  /** 是否可见 */
  visible?: boolean;
}

// 元素类型转换适配器
const adaptElementToUniversalUIType = (element: CompatibleUIElement): UIElement => {
  // 如果已经是完整的 UIElement 类型，直接返回
  if ('xpath' in element && 'is_clickable' in element) {
    return element as UIElement;
  }
  
  // 否则将 ElementMapperUIElement 转换为 UIElement
  const mapperElement = element as ElementMapperUIElement;
  return {
    id: mapperElement.id || 'unknown',
    element_type: mapperElement.element_type || 'unknown',
    text: mapperElement.text || '',
    bounds: mapperElement.bounds || { left: 0, top: 0, right: 0, bottom: 0 },
    xpath: '',
    resource_id: mapperElement.resource_id,
    class_name: '',
    is_clickable: mapperElement.clickable || false,
    is_scrollable: false,
    is_enabled: true,
    is_focused: false,
    checkable: false,
    checked: false,
    selected: false,
    password: false,
    content_desc: mapperElement.content_desc
  } as UIElement;
};

interface ElementSourceResult {
  /** 匹配的缓存页面 */
  cachedPage?: CachedXmlPage;
  /** 增强的视图数据 */
  cachedViewData?: CachedViewData;
  /** 匹配的元素索引 */
  matchedElementIndex?: number;
  /** 匹配置信度 (0-1) */
  matchConfidence?: number;
  /** 匹配的增强元素 */
  matchedEnhancedElement?: EnhancedUIElement;
}

export const ElementXmlHierarchyTab: React.FC<ElementXmlHierarchyTabProps> = ({
  element,
  visible = true
}) => {
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [cachedPages, setCachedPages] = useState<CachedXmlPage[]>([]);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);
  const [elementSource, setElementSource] = useState<ElementSourceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 初始化加载
  useEffect(() => {
    if (visible && element) {
      loadCachedPagesAndFindSource();
    }
  }, [visible, element]);

  /**
   * 加载缓存页面并智能查找元素来源
   */
  const loadCachedPagesAndFindSource = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 开始加载XML层级数据...');
      
      // 1. 获取所有XML缓存页面
      const pages = await XmlPageCacheService.getCachedPages();
      setCachedPages(pages);
      
      if (pages.length === 0) {
        setError('没有找到XML缓存页面数据。请先使用"Universal UI智能页面查找"分析页面。');
        return;
      }

      // 2. 使用智能查找器找到最佳匹配页面
      const sourceResult = await ElementSourceFinder.findBestSourcePage(element, pages);
      setElementSource(sourceResult);
      
      // 3. 设置默认选中的页面索引
      if (sourceResult.cachedPage) {
        const foundIndex = pages.findIndex(p => p.fileName === sourceResult.cachedPage!.fileName);
        setSelectedPageIndex(Math.max(0, foundIndex));
      }
      
      console.log('✅ XML层级数据加载完成', {
        totalPages: pages.length,
        matchConfidence: sourceResult.matchConfidence,
        hasEnhancedData: !!sourceResult.cachedViewData
      });
      
    } catch (error) {
      console.error('❌ 加载XML层级数据失败:', error);
      setError(`加载失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 切换选中的XML页面
   */
  const handlePageSwitch = async (pageIndex: number) => {
    if (pageIndex >= cachedPages.length) return;
    
    const targetPage = cachedPages[pageIndex];
    setLoading(true);
    
    try {
      console.log(`🔄 切换到页面: ${targetPage.pageTitle}`);
      
      // 加载页面的增强数据
      const cachedViewData = await EnhancedXmlCacheService.loadEnhancedPageData(targetPage);
      
      // 在新页面中查找匹配的元素
      const matchResult = ElementSourceFinder.findElementInUnifiedData(
        element, 
        cachedViewData.unifiedData
      );
      
      setElementSource({
        cachedPage: targetPage,
        cachedViewData,
        matchedElementIndex: matchResult.elementIndex,
        matchConfidence: matchResult.confidence,
        matchedEnhancedElement: matchResult.enhancedElement
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
   * 强制刷新数据
   */
  const handleRefresh = async () => {
    // 清除缓存，强制重新加载
    XmlPageCacheService.clearCache();
    await loadCachedPagesAndFindSource();
    message.success('数据已刷新');
  };

  // 计算统计信息
  const statistics = useMemo(() => {
    if (!elementSource?.cachedViewData) return null;
    
    const { unifiedData } = elementSource.cachedViewData;
    return {
      totalElements: unifiedData.enhancedElements.length,
      clickableElements: unifiedData.enhancedElements.filter(el => el.is_clickable).length,
      treeNodes: unifiedData.treeViewData.hierarchyMap?.size || 0,
      hasVisualData: !!unifiedData.visualViewData,
      pageTitle: elementSource.cachedPage?.pageTitle || '未知页面'
    };
  }, [elementSource]);

  // 渲染加载状态
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>
          <Text>正在加载XML层级结构数据...</Text>
        </div>
      </div>
    );
  }

  // 渲染错误状态
  if (error) {
    return (
      <Alert
        message="数据加载失败"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={loadCachedPagesAndFindSource}>
            重新加载
          </Button>
        }
      />
    );
  }

  // 渲染空状态
  if (cachedPages.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <BranchesOutlined style={{ fontSize: '64px', color: '#d9d9d9' }} />
        <div style={{ marginTop: '24px' }}>
          <Title level={4} type="secondary">暂无XML缓存数据</Title>
          <Text type="secondary" style={{ fontSize: '14px' }}>
            请先使用 <strong>"Universal UI智能页面查找"</strong> 功能分析页面
            <br />
            系统会自动缓存页面的完整XML结构和增强数据
          </Text>
          <div style={{ marginTop: '16px' }}>
            <Button 
              type="primary" 
              icon={<SearchOutlined />}
              onClick={handleRefresh}
            >
              重新检查缓存
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="element-xml-hierarchy-tab">
      {/* 功能说明和统计信息 */}
      <Row gutter={16} style={{ marginBottom: '16px' }}>
        <Col span={16}>
          <Alert
            message="XML层级结构浏览"
            description="基于Universal UI智能分析的增强缓存数据，显示元素在原始Android界面中的完整层级关系和上下文信息。"
            type="info"
            showIcon
          />
        </Col>
        <Col span={8}>
          {statistics && (
            <Card size="small" title={<Space><ThunderboltOutlined />缓存统计</Space>}>
              <div style={{ fontSize: '12px' }}>
                <div>📱 页面: {statistics.pageTitle}</div>
                <div>🔢 元素总数: {statistics.totalElements}</div>
                <div>👆 可点击: {statistics.clickableElements}</div>
                <div>🌳 树节点: {statistics.treeNodes}</div>
                <Tag color={statistics.hasVisualData ? 'green' : 'orange'}>
                  {statistics.hasVisualData ? '增强数据完整' : '基础数据'}
                </Tag>
              </div>
            </Card>
          )}
        </Col>
      </Row>

      {/* 元素匹配信息 */}
      <ElementMatchInfo 
        element={element}
        sourceResult={elementSource}
      />

      {/* 可折叠的页面选择器 */}
      <Collapse 
        size="small" 
        style={{ marginBottom: '16px' }}
        items={[
          {
            key: 'pageSelector',
            label: (
              <Space>
                <FileTextOutlined />
                页面选择器
                <Tag color="blue">{cachedPages.length} 个页面</Tag>
                {elementSource?.matchConfidence && (
                  <Tag color={
                    elementSource.matchConfidence > 0.8 ? 'green' :
                    elementSource.matchConfidence > 0.5 ? 'orange' : 'red'
                  }>
                    匹配度: {Math.round(elementSource.matchConfidence * 100)}%
                  </Tag>
                )}
              </Space>
            ),
            children: (
              <PageSelector
                pages={cachedPages}
                selectedIndex={selectedPageIndex}
                elementSource={elementSource}
                onPageSelect={handlePageSwitch}
              />
            ),
            extra: (
              <Button 
                size="small" 
                icon={<ReloadOutlined />} 
                onClick={(e) => {
                  e.stopPropagation();
                  handleRefresh();
                }}
                title="刷新缓存数据"
              />
            )
          }
        ]}
      />

      {/* 主要内容：层级树浏览器 */}
      {elementSource?.cachedViewData && (
        <HierarchyTreeViewer
          unifiedData={elementSource.cachedViewData.unifiedData}
          matchedElement={elementSource.matchedEnhancedElement}
          matchedIndex={elementSource.matchedElementIndex}
        />
      )}
    </div>
  );
};

export default ElementXmlHierarchyTab;