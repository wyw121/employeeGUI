/**
 * ElementFieldsViewer 使用指南和测试页面
 * 展示如何使用新的元素字段详情查看功能
 */

import React, { useState } from 'react';
import { 
  Card, 
  Button, 
  Space, 
  Typography, 
  Divider, 
  Row, 
  Col,
  Alert,
  Steps,
  Tag,
  message
} from 'antd';
import {
  ExperimentOutlined,
  BranchesOutlined,
  InfoCircleOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';

import type { UIElement } from '../../api/universalUIAPI';
import { ElementFieldsViewer, EnhancedHierarchyTreeViewer } from './';

const { Title, Paragraph, Text } = Typography;
const { Step } = Steps;

// 示例元素数据
const sampleElement: UIElement = {
  id: 'com.example.app:id/sample_button',
  element_type: 'android.widget.Button',
  text: '点击按钮',
  bounds: { left: 100, top: 200, right: 300, bottom: 250 },
  xpath: '//android.widget.Button[@resource-id="com.example.app:id/sample_button"]',
  resource_id: 'com.example.app:id/sample_button',
  class_name: 'android.widget.Button',
  is_clickable: true,
  is_scrollable: false,
  is_enabled: true,
  is_focused: false,
  checkable: false,
  checked: false,
  selected: false,
  password: false,
  content_desc: '一个示例点击按钮'
};

const sampleElements: UIElement[] = [
  sampleElement,
  {
    id: 'com.example.app:id/sample_text',
    element_type: 'android.widget.TextView',
    text: '这是示例文本',
    bounds: { left: 50, top: 100, right: 350, bottom: 150 },
    xpath: '//android.widget.TextView[@resource-id="com.example.app:id/sample_text"]',
    resource_id: 'com.example.app:id/sample_text',
    class_name: 'android.widget.TextView',
    is_clickable: false,
    is_scrollable: false,
    is_enabled: true,
    is_focused: false,
    checkable: false,
    checked: false,
    selected: false,
    password: false,
    content_desc: '示例文本视图'
  },
  {
    id: 'com.example.app:id/sample_input',
    element_type: 'android.widget.EditText',
    text: '',
    bounds: { left: 80, top: 300, right: 320, bottom: 350 },
    xpath: '//android.widget.EditText[@resource-id="com.example.app:id/sample_input"]',
    resource_id: 'com.example.app:id/sample_input',
    class_name: 'android.widget.EditText',
    is_clickable: true,
    is_scrollable: false,
    is_enabled: true,
    is_focused: true,
    checkable: false,
    checked: false,
    selected: false,
    password: false,
    content_desc: '输入框'
  }
];

export const ElementFieldsViewerGuide: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showCompact, setShowCompact] = useState(false);

  const steps = [
    {
      title: '了解功能',
      description: '新的元素字段详情展示功能',
    },
    {
      title: '查看单元素',
      description: '独立使用ElementFieldsViewer组件',
    },
    {
      title: '体验树形结构',
      description: '在树形结构中展开元素字段',
    }
  ];

  return (
    <div className="element-fields-viewer-guide p-4">
      <Card>
        <Title level={2}>
          <Space>
            <ExperimentOutlined />
            ElementFieldsViewer 功能指南
          </Space>
        </Title>
        
        <Alert
          message="全新的元素字段展示功能"
          description="现在您可以在XML层级树的最底层节点展开查看元素的详细字段信息，包括文本、资源ID、边界位置、交互属性等所有字段。"
          type="info"
          icon={<InfoCircleOutlined />}
          showIcon
          style={{ marginBottom: 24 }}
        />

        {/* 功能演示步骤 */}
        <Steps current={currentStep} style={{ marginBottom: 24 }}>
          {steps.map(item => (
            <Step key={item.title} title={item.title} description={item.description} />
          ))}
        </Steps>

        {/* 步骤内容 */}
        {currentStep === 0 && (
          <Card title="🎯 核心功能特性">
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Card size="small" hoverable>
                  <div className="text-center">
                    <BranchesOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                    <Title level={4}>分层展示</Title>
                    <Text type="secondary">
                      按优先级分组显示字段：核心属性、交互属性、扩展信息
                    </Text>
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" hoverable>
                  <div className="text-center">
                    <InfoCircleOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
                    <Title level={4}>智能格式化</Title>
                    <Text type="secondary">
                      根据字段类型智能格式化显示：布尔值、对象、长文本等
                    </Text>
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" hoverable>
                  <div className="text-center">
                    <CheckCircleOutlined style={{ fontSize: '24px', color: '#fa8c16' }} />
                    <Title level={4}>紧凑模式</Title>
                    <Text type="secondary">
                      支持紧凑模式显示，只展示有值的重要字段
                    </Text>
                  </div>
                </Card>
              </Col>
            </Row>
          </Card>
        )}

        {currentStep === 1 && (
          <div>
            <Card 
              title="📋 独立字段查看器演示" 
              extra={
                <Space>
                  <Button 
                    size="small" 
                    type={showCompact ? "primary" : "default"}
                    onClick={() => setShowCompact(!showCompact)}
                  >
                    {showCompact ? '完整模式' : '紧凑模式'}
                  </Button>
                  <Tag color="blue">示例元素</Tag>
                </Space>
              }
            >
              <ElementFieldsViewer 
                element={sampleElement}
                compact={showCompact}
                bordered={true}
              />
            </Card>
            
            <Paragraph style={{ marginTop: 16 }}>
              <Text strong>使用说明：</Text>
              <ul>
                <li>核心属性：显示文本、资源ID、类名等最重要的信息</li>
                <li>交互属性：显示是否可点击、可滚动等交互相关属性</li>
                <li>扩展信息：显示XPath、焦点状态等详细技术信息</li>
                <li>字段统计：显示总字段数、有值字段数等统计信息</li>
              </ul>
            </Paragraph>
          </div>
        )}

        {currentStep === 2 && (
          <div>
            <Card title="🌳 增强树形结构演示">
              <Alert
                message="在实际使用中的效果"
                description="在智能脚本构建器的'修改元素参数'步骤中，选择'XML层级树'标签页，您将看到每个最底层元素都可以展开查看详细字段信息。"
                type="success"
                style={{ marginBottom: 16 }}
              />
              
              <EnhancedHierarchyTreeViewer
                elements={sampleElements}
                targetElement={sampleElement}
                loading={false}
                showSearch={true}
              />
            </Card>

            <Paragraph style={{ marginTop: 16 }}>
              <Text strong>在树形结构中：</Text>
              <ul>
                <li><Tag color="purple">深度层级</Tag> 节点可以展开查看该层级的所有元素</li>
                <li>每个元素节点都包含一个可展开的 <Tag color="geekblue">字段详情</Tag> 子节点</li>
                <li>展开字段详情后可以看到元素的所有属性信息</li>
                <li>支持搜索功能，可以按文本、资源ID、类名等进行过滤</li>
              </ul>
            </Paragraph>
          </div>
        )}

        {/* 导航按钮 */}
        <Divider />
        <Row justify="space-between">
          <Col>
            <Button 
              disabled={currentStep === 0}
              onClick={() => setCurrentStep(currentStep - 1)}
            >
              上一步
            </Button>
          </Col>
          <Col>
            <Space>
              <Text type="secondary">步骤 {currentStep + 1} / {steps.length}</Text>
              {currentStep === steps.length - 1 ? (
                <Button 
                  type="primary" 
                  icon={<PlayCircleOutlined />}
                  onClick={() => {
                    message.success('现在可以去智能脚本构建器中体验新功能了！');
                  }}
                >
                  开始使用
                </Button>
              ) : (
                <Button 
                  type="primary"
                  onClick={() => setCurrentStep(currentStep + 1)}
                >
                  下一步
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default ElementFieldsViewerGuide;