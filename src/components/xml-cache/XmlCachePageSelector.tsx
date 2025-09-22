/**
 * XML页面缓存选择器组件
 * 用于显示和选择历史分析过的XML页面
 */

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  List, 
  Button, 
  Tag, 
  Tooltip, 
  Space, 
  Typography, 
  Avatar, 
  message, 
  Spin, 
  Popconfirm,
  Statistic,
  Row,
  Col,
  Empty,
  Input
} from 'antd';
import { 
  FileTextOutlined, 
  ClockCircleOutlined, 
  DeleteOutlined, 
  ReloadOutlined,
  MobileOutlined,
  AppstoreOutlined,
  SearchOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { XmlPageCacheService, CachedXmlPage } from '../../services/XmlPageCacheService';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

interface XmlCachePageSelectorProps {
  /** 当选择缓存页面时的回调 */
  onPageSelected?: (cachedPage: CachedXmlPage) => void;
  /** 是否显示统计信息 */
  showStats?: boolean;
  /** 最大显示页面数量 */
  maxPages?: number;
}

export const XmlCachePageSelector: React.FC<XmlCachePageSelectorProps> = ({
  onPageSelected,
  showStats = true,
  maxPages = 20
}) => {
  const [loading, setLoading] = useState(false);
  const [cachedPages, setCachedPages] = useState<CachedXmlPage[]>([]);
  const [filteredPages, setFilteredPages] = useState<CachedXmlPage[]>([]);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [searchText, setSearchText] = useState('');

  // 加载缓存页面
  const loadCachedPages = async () => {
    setLoading(true);
    try {
      console.log('🔄 加载XML缓存页面...');
      
      const pages = await XmlPageCacheService.getCachedPages();
      const stats = await XmlPageCacheService.getCacheStats();
      
      setCachedPages(pages);
      setFilteredPages(pages.slice(0, maxPages));
      setCacheStats(stats);
      
      console.log(`✅ 加载了 ${pages.length} 个缓存页面`);
      
      if (pages.length === 0) {
        message.info('暂无XML缓存页面，请先连接设备分析页面');
      }
      
    } catch (error) {
      console.error('❌ 加载缓存页面失败:', error);
      message.error('加载缓存页面失败，请检查debug_xml目录');
    } finally {
      setLoading(false);
    }
  };

  // 刷新缓存
  const handleRefresh = async () => {
    try {
      await XmlPageCacheService.refreshCache();
      await loadCachedPages();
      message.success('缓存刷新成功');
    } catch (error) {
      console.error('❌ 刷新缓存失败:', error);
      message.error('刷新缓存失败');
    }
  };

  // 删除缓存页面
  const handleDeletePage = async (page: CachedXmlPage) => {
    const initialCount = cachedPages.length;
    
    try {
      console.log(`🗑️ 准备删除页面: ${page.pageTitle} (${page.fileName})`);
      console.log(`📊 删除前页面数量: ${initialCount}`);
      
      await XmlPageCacheService.deleteCachedPage(page.fileName);
      
      // 强制刷新缓存列表
      await XmlPageCacheService.clearCache();
      await loadCachedPages();
      
      const finalCount = cachedPages.length;
      console.log(`� 删除后页面数量: ${finalCount}`);
      
      message.success(`已删除: ${page.pageTitle} (剩余 ${finalCount} 个页面)`);
      
    } catch (error) {
      console.error('❌ 删除页面失败:', error);
      message.error('删除页面失败');
    }
  };

  // 选择页面
  const handlePageSelect = (page: CachedXmlPage) => {
    console.log('🎯 选择缓存页面:', page.pageTitle);
    
    if (onPageSelected) {
      onPageSelected(page);
    }
    
    message.success({
      content: (
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            📄 已选择缓存页面
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {page.pageTitle}
          </div>
        </div>
      ),
      duration: 2
    });
  };

  // 搜索过滤
  const handleSearch = (value: string) => {
    setSearchText(value);
    
    if (!value.trim()) {
      setFilteredPages(cachedPages.slice(0, maxPages));
      return;
    }
    
    const filtered = cachedPages.filter(page => 
      page.pageTitle.toLowerCase().includes(value.toLowerCase()) ||
      page.description.toLowerCase().includes(value.toLowerCase()) ||
      page.appPackage.toLowerCase().includes(value.toLowerCase()) ||
      page.deviceId.toLowerCase().includes(value.toLowerCase())
    ).slice(0, maxPages);
    
    setFilteredPages(filtered);
  };

  // 组件加载时获取缓存页面
  useEffect(() => {
    loadCachedPages();
  }, []);

  // 获取应用图标
  const getAppIcon = (appPackage: string) => {
    if (appPackage.includes('xhs')) {
      return '📱';
    } else if (appPackage.includes('tencent.mm')) {
      return '💬';
    } else if (appPackage.includes('contacts')) {
      return '📞';
    }
    return '📋';
  };

  // 获取应用名称
  const getAppName = (appPackage: string) => {
    if (appPackage.includes('xhs')) {
      return '小红书';
    } else if (appPackage.includes('tencent.mm')) {
      return '微信';
    } else if (appPackage.includes('contacts')) {
      return '通讯录';
    }
    return '未知应用';
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  // 格式化时间
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 60) {
      return `${minutes}分钟前`;
    } else if (hours < 24) {
      return `${hours}小时前`;
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // 定义内联样式来控制 List.Item actions 区域宽度
  const listItemStyles = `
    .xml-cache-list-item .ant-list-item-action {
      margin-left: 8px !important;
      min-width: 32px !important;
      flex: 0 0 32px !important;
    }
    .xml-cache-list-item .ant-list-item-action > li {
      padding: 0 !important;
      margin: 0 !important;
    }
  `;

  return (
    <>
      {/* 注入样式 */}
      <style dangerouslySetInnerHTML={{ __html: listItemStyles }} />
      <div style={{ 
        padding: '16px',
        backgroundColor: 'transparent'
      }}>
      {/* 标题和操作栏 */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <Title level={4} style={{ 
            margin: 0, 
            display: 'flex', 
            alignItems: 'center',
            color: '#f9fafb'
          }}>
            <FileTextOutlined style={{ marginRight: '8px', color: '#6366f1' }} />
            XML页面缓存
          </Title>
          
          <Space>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={handleRefresh}
              loading={loading}
              size="small"
            >
              刷新
            </Button>
          </Space>
        </div>
        
        {/* 搜索框 */}
        <Search
          placeholder="搜索页面标题、应用或设备..."
          allowClear
          size="small"
          style={{ marginBottom: '12px' }}
          onSearch={handleSearch}
          onChange={(e) => handleSearch(e.target.value)}
        />
        
        {/* 统计信息 - 优化小屏布局 */}
        {showStats && cacheStats && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', // 改为2列布局
            gap: '8px', 
            marginBottom: '12px' 
          }}>
            <Card 
              size="small" 
              style={{ 
                textAlign: 'center', 
                padding: '8px 4px',
                minHeight: 'auto',
              }}
              bodyStyle={{ padding: '8px 4px' }}
            >
              <div style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>
                总页面数
              </div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1890ff' }}>
                {cacheStats.totalPages}
              </div>
            </Card>
            <Card 
              size="small" 
              style={{ 
                textAlign: 'center', 
                padding: '8px 4px',
                minHeight: 'auto',
              }}
              bodyStyle={{ padding: '8px 4px' }}
            >
              <div style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>
                缓存大小
              </div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#52c41a' }}>
                {formatFileSize(cacheStats.totalSize)}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* 页面列表 */}
      <Spin spinning={loading}>
        {filteredPages.length === 0 ? (
          <Empty 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              searchText ? 
              `没有找到匹配 "${searchText}" 的缓存页面` : 
              "暂无XML缓存页面\n请先连接设备并分析页面"
            }
          />
        ) : (
          <List
            size="small"
            dataSource={filteredPages}
            renderItem={(page) => (
              <List.Item
                className="xml-cache-list-item"
                style={{ 
                  padding: '8px 8px', // 减少内边距
                  border: '1px solid #374151',
                  borderRadius: '6px',
                  marginBottom: '4px',
                  backgroundColor: '#374151',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  minHeight: 'auto', // 允许自适应高度
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#4b5563';
                  e.currentTarget.style.borderColor = '#6366f1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#374151';
                  e.currentTarget.style.borderColor = '#374151';
                }}
                onClick={() => handlePageSelect(page)}
                actions={[
                  <div key="delete" style={{ width: '32px', textAlign: 'center' }}>
                    <Popconfirm
                      title="删除?"
                      onConfirm={(e) => {
                        e?.stopPropagation();
                        handleDeletePage(page);
                      }}
                      okText="删除"
                      cancelText="取消"
                    >
                      <Button 
                        type="text" 
                        danger 
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={(e) => e.stopPropagation()}
                        style={{ 
                          fontSize: '10px', 
                          padding: '4px',
                          minWidth: '24px',  // 最小宽度
                          width: '24px',     // 固定宽度
                          height: '24px'     // 固定高度
                        }}
                      />
                    </Popconfirm>
                  </div>
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <span style={{ 
                      fontSize: '14px', // 缩小图标
                      display: 'inline-block',
                      width: '20px', // 缩小宽度
                      textAlign: 'center',
                      flexShrink: 0, // 防止收缩
                    }}>
                      {getAppIcon(page.appPackage)}
                    </span>
                  }
                  title={
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', // 改为垂直布局
                      gap: '2px',
                      minWidth: 0, // 允许收缩
                    }}>
                      <Text 
                        strong 
                        style={{ 
                          fontSize: '12px', 
                          color: '#f9fafb',
                          lineHeight: '1.2',
                          wordBreak: 'break-all', // 强制换行
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2, // 最多显示2行
                          WebkitBoxOrient: 'vertical' as any,
                        }}
                        title={page.pageTitle} // 悬浮显示完整标题
                      >
                        {page.pageTitle}
                      </Text>
                      <Text 
                        type="secondary" 
                        style={{ 
                          fontSize: '10px', 
                          color: '#d1d5db',
                          lineHeight: '1',
                        }}
                      >
                        {formatTime(page.createdAt)}
                      </Text>
                    </div>
                  }
                  description={
                    <div style={{ 
                      fontSize: '10px', 
                      color: '#9ca3af',
                      lineHeight: '1.2',
                      marginTop: '4px',
                    }}>
                      <div style={{ marginBottom: '2px' }}>{page.deviceId}</div>
                      <div>
                        {page.clickableCount}个元素 • {formatFileSize(page.fileSize)}
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Spin>
      </div>
    </>
  );
};

export default XmlCachePageSelector;