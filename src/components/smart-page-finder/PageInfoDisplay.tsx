/**
 * 页面信息显示组件
 * 显示当前页面的详细信息
 */

import React from 'react';
import { Space, Typography, Tag, Descriptions, Avatar } from 'antd';
import { 
  AppstoreOutlined,
  MobileOutlined,
  ClockCircleOutlined,
  TagOutlined,
} from '@ant-design/icons';
import { PageInfoEntity, PageType } from '../../domain/page-analysis';

const { Text, Title } = Typography;

export interface PageInfoDisplayProps {
  pageInfo: PageInfoEntity;
}

export const PageInfoDisplay: React.FC<PageInfoDisplayProps> = ({ pageInfo }) => {
  const getPageTypeInfo = (pageType: PageType) => {
    const typeMap = {
      [PageType.XIAOHONGSHU_HOME]: { color: '#ff2442', icon: '🏠', text: '小红书首页' },
      [PageType.XIAOHONGSHU_PROFILE]: { color: '#ff2442', icon: '👤', text: '小红书个人中心' },
      [PageType.XIAOHONGSHU_MESSAGES]: { color: '#ff2442', icon: '💬', text: '小红书消息' },
      [PageType.XIAOHONGSHU_SEARCH]: { color: '#ff2442', icon: '🔍', text: '小红书搜索' },
      [PageType.XIAOHONGSHU_DETAIL]: { color: '#ff2442', icon: '📄', text: '小红书详情' },
      [PageType.WEIXIN_CHAT]: { color: '#07c160', icon: '💬', text: '微信聊天' },
      [PageType.WEIXIN_CONTACTS]: { color: '#07c160', icon: '📱', text: '微信通讯录' },
      [PageType.CONTACTS]: { color: '#1890ff', icon: '📞', text: '系统通讯录' },
      [PageType.SETTINGS]: { color: '#722ed1', icon: '⚙️', text: '设置页面' },
      [PageType.UNKNOWN]: { color: '#8c8c8c', icon: '❓', text: '未知页面' },
    };

    return typeMap[pageType] || typeMap[PageType.UNKNOWN];
  };

  const typeInfo = getPageTypeInfo(pageInfo.pageType);

  const getAppIcon = (packageName: string) => {
    if (packageName.includes('xingin.xhs')) return '📱'; // 小红书
    if (packageName.includes('tencent.mm')) return '💬'; // 微信
    if (packageName.includes('contacts')) return '📞'; // 通讯录
    return '📋';
  };

  const formatTime = (date: Date) => {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {/* 页面标题 */}
      <div style={{ textAlign: 'center' }}>
        <Avatar 
          size={48} 
          style={{ backgroundColor: typeInfo.color, fontSize: '24px' }}
        >
          {typeInfo.icon}
        </Avatar>
        <Title level={5} style={{ margin: '8px 0 0 0' }}>
          {pageInfo.pageName}
        </Title>
      </div>

      {/* 页面类型标签 */}
      <div style={{ textAlign: 'center' }}>
        <Tag color={typeInfo.color} icon={<TagOutlined />}>
          {typeInfo.text}
        </Tag>
      </div>

      {/* 详细信息 */}
      <Descriptions size="small" column={1} colon={false}>
        <Descriptions.Item 
          label={
            <Space>
              <AppstoreOutlined />
              <Text strong>应用包名</Text>
            </Space>
          }
        >
          <Text code copyable={{ text: pageInfo.appPackage }}>
            {pageInfo.appPackage.split('.').pop()}
          </Text>
        </Descriptions.Item>

        <Descriptions.Item 
          label={
            <Space>
              <MobileOutlined />
              <Text strong>Activity</Text>
            </Space>
          }
        >
          <Text code copyable={{ text: pageInfo.activityName }}>
            {pageInfo.activityName.split('.').pop()}
          </Text>
        </Descriptions.Item>

        <Descriptions.Item 
          label={
            <Space>
              <MobileOutlined />
              <Text strong>屏幕分辨率</Text>
            </Space>
          }
        >
          <Text>
            {pageInfo.screenResolution.width} × {pageInfo.screenResolution.height}
          </Text>
        </Descriptions.Item>

        <Descriptions.Item 
          label={
            <Space>
              <ClockCircleOutlined />
              <Text strong>分析时间</Text>
            </Space>
          }
        >
          <Text type="secondary">
            {formatTime(pageInfo.analyzedAt)}
          </Text>
        </Descriptions.Item>

        {pageInfo.title && (
          <Descriptions.Item 
            label={<Text strong>页面标题</Text>}
          >
            <Text>{pageInfo.title}</Text>
          </Descriptions.Item>
        )}
      </Descriptions>

      {/* 页面特性标签 */}
      <div>
        <Space wrap>
          {pageInfo.isXiaohongshuPage() && (
            <Tag color="red">小红书应用</Tag>
          )}
          {pageInfo.isWeixinPage() && (
            <Tag color="green">微信应用</Tag>
          )}
          <Tag color="blue">已分析</Tag>
        </Space>
      </div>
    </Space>
  );
};