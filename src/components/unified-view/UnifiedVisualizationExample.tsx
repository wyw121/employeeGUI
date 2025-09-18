/**
 * 统一可视化视图使用示例
 * 展示如何集成和使用新的统一可视化视图组件
 */

import React, { useState } from 'react';
import { Button, Card, Typography, Space } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { UnifiedVisualizationView } from './UnifiedVisualizationView';
import { UIElement } from '../../api/universalUIAPI';

const { Title, Paragraph } = Typography;

// 模拟数据用于演示
const mockElements: UIElement[] = [
  {
    id: '1',
    element_type: 'Button',
    text: '登录按钮',
    bounds: { left: 100, top: 200, right: 200, bottom: 250 },
    xpath: '//Button[@text="登录"]',
    is_clickable: true,
    is_scrollable: false,
    is_enabled: true,
    checkable: false,
    checked: false,
    selected: false,
    password: false,
    resource_id: 'login_btn',
    class_name: 'android.widget.Button'
  },
  {
    id: '2',
    element_type: 'EditText',
    text: '',
    bounds: { left: 50, top: 100, right: 250, bottom: 150 },
    xpath: '//EditText[@hint="用户名"]',
    is_clickable: true,
    is_scrollable: false,
    is_enabled: true,
    checkable: false,
    checked: false,
    selected: false,
    password: false,
    resource_id: 'username_input',
    class_name: 'android.widget.EditText',
    content_desc: '用户名输入框'
  },
  {
    id: '3',
    element_type: 'TextView',
    text: '欢迎使用小红书',
    bounds: { left: 50, top: 50, right: 250, bottom: 90 },
    xpath: '//TextView[@text="欢迎使用小红书"]',
    is_clickable: false,
    is_scrollable: false,
    is_enabled: true,
    checkable: false,
    checked: false,
    selected: false,
    password: false,
    resource_id: 'welcome_text',
    class_name: 'android.widget.TextView'
  },
  {
    id: '4',
    element_type: 'CheckBox',
    text: '记住密码',
    bounds: { left: 50, top: 300, right: 150, bottom: 330 },
    xpath: '//CheckBox[@text="记住密码"]',
    is_clickable: true,
    is_scrollable: false,
    is_enabled: true,
    checkable: true,
    checked: false,
    selected: false,
    password: false,
    resource_id: 'remember_cb',
    class_name: 'android.widget.CheckBox'
  },
  {
    id: '5',
    element_type: 'ScrollView',
    text: '',
    bounds: { left: 0, top: 400, right: 300, bottom: 600 },
    xpath: '//ScrollView',
    is_clickable: false,
    is_scrollable: true,
    is_enabled: true,
    checkable: false,
    checked: false,
    selected: false,
    password: false,
    resource_id: 'content_scroll',
    class_name: 'android.widget.ScrollView'
  }
];

export const UnifiedVisualizationExample: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [selectedElement, setSelectedElement] = useState<UIElement | null>(null);

  const handleElementSelect = (element: UIElement) => {
    setSelectedElement(element);
    console.log('Selected element:', element);
  };

  const handleRefresh = () => {
    console.log('Refreshing data...');
    // 这里可以调用API刷新数据
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Title level={3}>
          <EyeOutlined /> 统一可视化视图示例
        </Title>
        
        <Paragraph>
          这是新的统一可视化视图组件，整合了以下三个功能：
        </Paragraph>
        
        <ul>
          <li><strong>可视化分析</strong>：显示页面元素的位置和布局</li>
          <li><strong>列表视图</strong>：以卡片形式展示所有UI元素</li>
          <li><strong>层级树</strong>：显示元素的层级结构关系</li>
        </ul>

        <Paragraph>
          该组件采用了完整的暗黑主题设计，提供了统一的用户体验。
        </Paragraph>

        <Space>
          <Button 
            type="primary" 
            icon={<EyeOutlined />}
            onClick={() => setShowModal(true)}
            size="large"
          >
            打开可视化视图
          </Button>
          
          {selectedElement && (
            <Card size="small" style={{ maxWidth: 300 }}>
              <Title level={5}>当前选中元素:</Title>
              <p><strong>类型:</strong> {selectedElement.element_type}</p>
              <p><strong>文本:</strong> {selectedElement.text || '无'}</p>
              <p><strong>可点击:</strong> {selectedElement.is_clickable ? '是' : '否'}</p>
            </Card>
          )}
        </Space>
      </Card>

      <UnifiedVisualizationView
        visible={showModal}
        onClose={() => setShowModal(false)}
        elements={mockElements}
        onElementSelect={handleElementSelect}
        onRefresh={handleRefresh}
      />
    </div>
  );
};

export default UnifiedVisualizationExample;