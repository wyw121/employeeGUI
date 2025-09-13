/**
 * 小红书测试模块主页面
 * 集成所有测试组件的统一入口
 */

import React, { useState } from 'react';
import {
  Card,
  Tabs,
  Typography,
  Space,
  Tag,
  Alert,
  Divider
} from 'antd';
import {
  ExperimentOutlined,
  RocketOutlined,
  SettingOutlined,
  FileTextOutlined,
  HeartOutlined
} from '@ant-design/icons';

// 导入测试组件
import XiaohongshuFollowTest from './XiaohongshuFollowTest';
import XiaohongshuScriptTest from './XiaohongshuScriptTest';
import XiaohongshuQuickTest from './XiaohongshuQuickTest';
import XiaohongshuValidationTest from './XiaohongshuValidationTest';

const { Title, Paragraph, Text } = Typography;

/**
 * 小红书测试模块主页面
 */
export const XiaohongshuTestPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('validation');

  const tabItems = [
    {
      key: 'validation',
      label: (
        <Space>
          <SettingOutlined />
          功能验证
        </Space>
      ),
      children: <XiaohongshuValidationTest />,
      description: '验证基础功能是否正常，建议首次使用时运行'
    },
    {
      key: 'quick',
      label: (
        <Space>
          <RocketOutlined />
          快速测试
        </Space>
      ),
      children: <XiaohongshuQuickTest />,
      description: '一键执行完整的关注流程，适合快速验证功能'
    },
    {
      key: 'script',
      label: (
        <Space>
          <ExperimentOutlined />
          脚本测试
        </Space>
      ),
      children: <XiaohongshuScriptTest />,
      description: '详细的脚本执行过程，支持步骤监控和调试'
    },
    {
      key: 'component',
      label: (
        <Space>
          <SettingOutlined />
          组件测试
        </Space>
      ),
      children: <XiaohongshuFollowTest />,
      description: '基础组件测试，支持自定义配置和高级选项'
    }
  ];

  const getCurrentTabDescription = () => {
    const currentTab = tabItems.find(item => item.key === activeTab);
    return currentTab?.description || '';
  };

  return (
    <div style={{ padding: '24px', minHeight: '100vh' }}>
      {/* 页面头部 */}
      <Card style={{ marginBottom: '24px' }}>
        <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
          <div>
            <Title level={1} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
              <HeartOutlined style={{ color: '#f5222d', marginRight: '12px' }} />
              小红书关注功能测试平台
            </Title>
            <Paragraph style={{ margin: '8px 0 0 0', fontSize: '16px' }} type="secondary">
              自动化测试小红书好友关注功能的完整解决方案
            </Paragraph>
          </div>
          <Space>
            <Tag color="processing">测试版本 v1.0</Tag>
            <Tag color="success">功能完整</Tag>
          </Space>
        </Space>
      </Card>

      {/* 功能特性介绍 */}
      <Card style={{ marginBottom: '24px' }}>
        <Alert
          message="测试平台功能特性"
          description={
            <div>
              <Paragraph style={{ marginBottom: '8px' }}>
                本测试平台提供了四种不同层次的测试方式，满足不同场景的需求：
              </Paragraph>
              <ul style={{ marginBottom: 0 }}>
                <li><Text strong>功能验证:</Text> 验证基础功能是否正常，建议首次使用时运行</li>
                <li><Text strong>快速测试:</Text> 一键执行完整流程，适合功能验证和演示</li>
                <li><Text strong>脚本测试:</Text> 详细监控执行步骤，支持调试和问题诊断</li>
                <li><Text strong>组件测试:</Text> 基础功能测试，支持自定义配置和参数调整</li>
              </ul>
            </div>
          }
          type="info"
          showIcon
        />
      </Card>

      {/* 测试选项卡 */}
      <Card>
        <div style={{ marginBottom: '16px' }}>
          <Text type="secondary" style={{ fontSize: '16px' }}>
            {getCurrentTabDescription()}
          </Text>
        </div>
        
        <Divider />

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          size="large"
          items={tabItems.map(item => ({
            key: item.key,
            label: item.label,
            children: item.children
          }))}
        />
      </Card>

      {/* 页面底部信息 */}
      <Card style={{ marginTop: '24px' }} size="small">
        <Space split={<Divider type="vertical" />}>
          <Text type="secondary">
            <FileTextOutlined style={{ marginRight: '4px' }} />
            支持自动化关注流程
          </Text>
          <Text type="secondary">
            完整的错误处理和日志记录
          </Text>
          <Text type="secondary">
            支持多设备并发测试
          </Text>
          <Text type="secondary">
            实时监控和进度反馈
          </Text>
        </Space>
      </Card>
    </div>
  );
};

export default XiaohongshuTestPage;