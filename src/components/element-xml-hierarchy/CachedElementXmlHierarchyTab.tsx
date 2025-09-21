/**
 * XML层级结构标签页 - 基于Universal UI缓存数据
 * 整合页面选择和层级树显示功能
 */

import React, { useState, useEffect } from 'react';
import { Spin, Alert, message } from 'antd';
import CachedPageSelector from './CachedPageSelector';
import CachedHierarchyTreeViewer from './CachedHierarchyTreeViewer';
import type { CachedXmlPage, XmlPageContent } from '../../services/XmlPageCacheService';
import { XmlPageCacheService } from '../../services/XmlPageCacheService';
import { UIElement } from '../../api/universalUIAPI';
import UniversalUIAPI from '../../api/universalUIAPI';

interface ElementXmlHierarchyTabProps {
  /** 目标元素（用于高亮匹配） */
  targetElement?: UIElement;
  /** 元素选择回调 */
  onElementSelect?: (element: UIElement) => void;
  /** 当前选中的元素ID */
  selectedElementId?: string;
}

const ElementXmlHierarchyTab: React.FC<ElementXmlHierarchyTabProps> = ({
  targetElement,
  onElementSelect,
  selectedElementId
}) => {
  const [selectedPage, setSelectedPage] = useState<CachedXmlPage | undefined>();
  const [pageElements, setPageElements] = useState<UIElement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 处理页面选择
  const handlePageSelect = async (page: CachedXmlPage) => {
    setSelectedPage(page);
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 加载页面XML内容:', page.pageTitle);
      
      // 加载页面内容
      const pageContent: XmlPageContent = await XmlPageCacheService.loadPageContent(page);
      
      // 解析XML内容为UI元素
      const elements = await UniversalUIAPI.extractPageElements(pageContent.xmlContent);
      
      setPageElements(elements || []);
      console.log('✅ 成功加载', elements?.length || 0, '个UI元素');
      
    } catch (err) {
      console.error('加载页面内容失败:', err);
      const errorMessage = `加载页面内容失败: ${err}`;
      setError(errorMessage);
      message.error(errorMessage);
      setPageElements([]);
    } finally {
      setLoading(false);
    }
  };

  // 处理元素选择
  const handleElementSelect = (element: UIElement) => {
    console.log('选中元素:', {
      text: element.text,
      resource_id: element.resource_id,
      class_name: element.class_name,
      bounds: element.bounds
    });
    onElementSelect?.(element);
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* 页面选择器 */}
      <div className="flex-shrink-0">
        <CachedPageSelector
          selectedPage={selectedPage}
          onPageSelect={handlePageSelect}
          showRefresh={true}
        />
      </div>

      {/* 错误提示 */}
      {error && (
        <Alert
          message="加载失败"
          description={error}
          type="error"
          showIcon
          className="flex-shrink-0"
        />
      )}

      {/* 层级树视图 */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Spin size="large">
              <div className="p-8 text-center text-gray-500">
                加载页面数据...
              </div>
            </Spin>
          </div>
        ) : selectedPage ? (
          <CachedHierarchyTreeViewer
            elements={pageElements}
            targetElement={targetElement}
            onElementSelect={handleElementSelect}
            selectedElementId={selectedElementId}
            pageTitle={selectedPage.pageTitle}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            请先选择要查看的XML页面
          </div>
        )}
      </div>
    </div>
  );
};

export default ElementXmlHierarchyTab;