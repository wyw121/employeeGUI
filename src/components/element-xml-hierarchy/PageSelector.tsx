/**
 * 页面选择器组件
 * 允许用户选择不同的XML缓存页面查看层级结构
 */

import React from 'react';
import { Card, Space, Tag, Typography, Row, Col, Button, Tooltip } from 'antd';
import { 
  FileTextOutlined,
  ClockCircleOutlined,
  MobileOutlined,
  CheckCircleFilled,
  ThunderboltOutlined
} from '@ant-design/icons';

import type { CachedXmlPage } from '../../services/XmlPageCacheService';

const { Text } = Typography;

interface PageSelectorProps {
  /** 所有缓存页面 */
  pages: CachedXmlPage[];
  /** 当前选中的页面索引 */
  selectedIndex: number;
  /** 元素来源结果（用于显示匹配信息） */
  elementSource: any;
  /** 页面选择回调 */
  onPageSelect: (pageIndex: number) => void;
  /** 最大显示页面数量 */
  maxPages?: number;
}

export const PageSelector: React.FC<PageSelectorProps> = ({
  pages,
  selectedIndex,
  elementSource,
  onPageSelect,
  maxPages = 8
}) => {
  // 格式化时间显示
  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}小时前`;
    return date.toLocaleDateString();
  };

  // 判断页面是否是智能匹配的
  const isSmartMatched = (page: CachedXmlPage) => {
    return elementSource?.cachedPage?.fileName === page.fileName && 
           (elementSource?.matchConfidence || 0) > 0.7;
  };

  // 获取应用名称显示
  const getAppDisplayName = (appPackage: string) => {
    const appNames: { [key: string]: string } = {
      'com.xingin.xhs': '小红书',
      'com.tencent.mm': '微信',
      'com.sina.weibo': '微博',
      'com.taobao.taobao': '淘宝'
    };
    return appNames[appPackage] || appPackage.split('.').pop() || '未知应用';
  };

  const displayPages = pages.slice(0, maxPages);

  return (
    <div className="space-y-2">
      {displayPages.map((page, index) => {
        const isSelected = selectedIndex === index;
        const isMatched = isSmartMatched(page);
        
        return (
          <Card
            key={page.fileName}
            size="small"
            hoverable
            className={`cursor-pointer transition-all duration-200 ${
              isSelected 
                ? 'border-blue-500 bg-blue-50 shadow-md' 
                : 'border-gray-200 hover:border-gray-400 hover:shadow-sm'
            }`}
            onClick={() => onPageSelect(index)}
          >
            <Row justify="space-between" align="middle">
              <Col span={16}>
                <Space direction="vertical" size={2}>
                  {/* 页面标题和状态标签 */}
                  <Space wrap>
                    <Text 
                      strong 
                      style={{ 
                        fontSize: '14px',
                        color: isSelected ? '#1890ff' : '#333'
                      }}
                    >
                      {page.pageTitle}
                    </Text>
                    
                    {isSelected && (
                      <Tag color="blue" icon={<CheckCircleFilled />}>
                        当前选中
                      </Tag>
                    )}
                    
                    {isMatched && (
                      <Tooltip title="系统智能匹配的最佳页面">
                        <Tag color="green" icon={<ThunderboltOutlined />}>
                          智能匹配
                        </Tag>
                      </Tooltip>
                    )}
                    
                    <Tag color="purple">
                      {getAppDisplayName(page.appPackage)}
                    </Tag>
                  </Space>

                  {/* 页面详情信息 */}
                  <Space split={<span style={{ color: '#d9d9d9' }}>•</span>} size="small">
                    <Space size={4}>
                      <MobileOutlined style={{ color: '#999', fontSize: '12px' }} />
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {page.deviceId}
                      </Text>
                    </Space>
                    
                    <Space size={4}>
                      <ClockCircleOutlined style={{ color: '#999', fontSize: '12px' }} />
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {formatTime(page.createdAt)}
                      </Text>
                    </Space>
                    
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {(page.fileSize / 1024).toFixed(1)}KB
                    </Text>
                  </Space>

                  {/* 页面描述（如果有） */}
                  {page.description && (
                    <Text 
                      type="secondary" 
                      style={{ 
                        fontSize: '11px',
                        lineHeight: '1.3',
                        display: '-webkit-box',
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {page.description}
                    </Text>
                  )}
                </Space>
              </Col>

              {/* 右侧统计信息 */}
              <Col span={8} style={{ textAlign: 'right' }}>
                <Space direction="vertical" size={4} style={{ alignItems: 'flex-end' }}>
                  <Space>
                    <Tooltip title="页面元素总数">
                      <Tag color="blue" style={{ fontSize: '11px', margin: 0 }}>
                        {page.elementCount} 元素
                      </Tag>
                    </Tooltip>
                    <Tooltip title="可点击元素数量">
                      <Tag color="green" style={{ fontSize: '11px', margin: 0 }}>
                        {page.clickableCount} 可点击
                      </Tag>
                    </Tooltip>
                  </Space>

                  {/* 匹配度显示（如果这是匹配页面） */}
                  {isMatched && elementSource?.matchConfidence && (
                    <Tag 
                      color="orange" 
                      style={{ 
                        fontSize: '10px', 
                        margin: 0,
                        fontWeight: 'bold'
                      }}
                    >
                      {Math.round(elementSource.matchConfidence * 100)}% 匹配
                    </Tag>
                  )}

                  {/* 页面类型 */}
                  <Tag 
                    style={{ 
                      fontSize: '10px', 
                      margin: 0,
                      backgroundColor: isSelected ? '#e6f7ff' : '#f5f5f5',
                      borderColor: isSelected ? '#91d5ff' : '#d9d9d9',
                      color: isSelected ? '#096dd9' : '#666'
                    }}
                  >
                    {page.pageType}
                  </Tag>
                </Space>
              </Col>
            </Row>
          </Card>
        );
      })}

      {/* 如果页面过多，显示省略提示 */}
      {pages.length > maxPages && (
        <Card size="small" style={{ textAlign: 'center', backgroundColor: '#fafafa' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            还有 {pages.length - maxPages} 个页面未显示...
          </Text>
        </Card>
      )}
    </div>
  );
};

export default PageSelector;