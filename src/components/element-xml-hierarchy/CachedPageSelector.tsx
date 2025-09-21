/**
 * 页面选择器 - 用于选择缓存的XML页面
 * 从Universal UI缓存系统中选择要分析的页面
 */

import React, { useState, useEffect } from 'react';
import { Select, Card, Tag, Typography, Space, Button, message, Empty, Spin } from 'antd';
import { ReloadOutlined, FileTextOutlined } from '@ant-design/icons';
import type { CachedXmlPage } from '../../services/XmlPageCacheService';
import { XmlPageCacheService } from '../../services/XmlPageCacheService';

const { Text } = Typography;
const { Option } = Select;

interface PageSelectorProps {
  /** 当前选中的页面 */
  selectedPage?: CachedXmlPage;
  /** 页面选择回调 */
  onPageSelect: (page: CachedXmlPage) => void;
  /** 是否显示刷新按钮 */
  showRefresh?: boolean;
}

const PageSelector: React.FC<PageSelectorProps> = ({
  selectedPage,
  onPageSelect,
  showRefresh = true
}) => {
  const [loading, setLoading] = useState(false);
  const [cachedPages, setCachedPages] = useState<CachedXmlPage[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // 加载缓存页面列表
  const loadCachedPages = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setRefreshing(true);
    
    try {
      const pages = await XmlPageCacheService.getCachedPages();
      setCachedPages(pages);
      
      // 如果没有选中页面且有可用页面，自动选择最新的
      if (!selectedPage && pages.length > 0) {
        const latestPage = pages.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
        onPageSelect(latestPage);
      }
    } catch (error) {
      console.error('加载缓存页面失败:', error);
      message.error('加载缓存页面失败');
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    loadCachedPages();
  }, []);

  // 处理页面选择
  const handlePageChange = (pageFileName: string) => {
    const page = cachedPages.find(p => p.fileName === pageFileName);
    if (page) {
      onPageSelect(page);
    }
  };

  // 格式化时间显示
  const formatTime = (timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 渲染页面选项
  const renderPageOption = (page: CachedXmlPage) => (
    <div className="flex items-center justify-between p-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Text strong className="text-sm truncate">
            {page.pageTitle}
          </Text>
          <Tag color="blue" className="text-xs">
            {page.deviceId}
          </Tag>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{formatTime(page.createdAt)}</span>
          <span>•</span>
          <span>{page.elementCount} 元素</span>
          {page.clickableCount > 0 && (
            <>
              <span>•</span>
              <span className="text-green-600">{page.clickableCount} 可点击</span>
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Card className="w-full">
        <div className="flex items-center justify-center py-4">
          <Spin size="large">
            <div className="p-8 text-center text-gray-500">
              加载缓存页面...
            </div>
          </Spin>
        </div>
      </Card>
    );
  }

  if (cachedPages.length === 0) {
    return (
      <Card className="w-full">
        <Empty
          description="暂无缓存的XML页面"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ margin: '20px 0' }}
        >
          <Text type="secondary" className="text-sm">
            请先使用Universal UI智能页面查找功能分析页面，或刷新缓存列表
          </Text>
        </Empty>
      </Card>
    );
  }

  return (
    <Card 
      className="w-full"
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileTextOutlined />
            <Text strong>选择XML页面</Text>
          </div>
          {showRefresh && (
            <Button
              size="small"
              icon={<ReloadOutlined />}
              loading={refreshing}
              onClick={() => loadCachedPages(false)}
              title="刷新页面列表"
            >
              刷新
            </Button>
          )}
        </div>
      }
      size="small"
    >
      <div className="space-y-3">
        {/* 页面选择下拉框 */}
        <Select
          value={selectedPage?.fileName}
          onChange={handlePageChange}
          placeholder="请选择要查看的XML页面"
          className="w-full"
          showSearch
          optionFilterProp="children"
          dropdownRender={(menu) => (
            <div>
              {menu}
            </div>
          )}
        >
          {cachedPages.map((page) => (
            <Option key={page.fileName} value={page.fileName}>
              {renderPageOption(page)}
            </Option>
          ))}
        </Select>

        {/* 选中页面的详细信息 */}
        {selectedPage && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <Text type="secondary">页面标题:</Text>
                <div className="font-medium">{selectedPage.pageTitle}</div>
              </div>
              <div>
                <Text type="secondary">设备ID:</Text>
                <div className="font-medium">{selectedPage.deviceId}</div>
              </div>
              <div>
                <Text type="secondary">应用包名:</Text>
                <div className="font-medium text-blue-600">{selectedPage.appPackage}</div>
              </div>
              <div>
                <Text type="secondary">页面类型:</Text>
                <div className="font-medium">{selectedPage.pageType}</div>
              </div>
              <div>
                <Text type="secondary">创建时间:</Text>
                <div className="font-medium">{formatTime(selectedPage.createdAt)}</div>
              </div>
              <div>
                <Text type="secondary">文件大小:</Text>
                <div className="font-medium">{(selectedPage.fileSize / 1024).toFixed(1)} KB</div>
              </div>
            </div>
            
            {/* 页面预览信息 */}
            {selectedPage.preview && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <Text type="secondary" className="text-xs">页面预览:</Text>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedPage.preview.mainButtons.slice(0, 3).map((button, index) => (
                    <Tag key={index} color="green" className="text-xs">
                      {button}
                    </Tag>
                  ))}
                  {selectedPage.preview.inputCount > 0 && (
                    <Tag color="orange" className="text-xs">
                      {selectedPage.preview.inputCount} 个输入框
                    </Tag>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default PageSelector;