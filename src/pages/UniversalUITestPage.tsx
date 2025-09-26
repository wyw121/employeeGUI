/**
 * Universal UI 智能页面查找器功能验证页面
 * 用于测试完整的XML数据传递和检查器功能
 */

import React, { useState } from 'react';
import { Button, Card, Space, Typography, Divider, message } from 'antd';
import { SearchOutlined, BugOutlined } from '@ant-design/icons';
import { UniversalPageFinderModal } from '../components/universal-ui/UniversalPageFinderModal';
// 统一卡片渲染已采用 DraggableStepCard，通过 SmartStepCardWrapper 进行适配
import { SmartStepCardWrapper } from '../components/SmartStepCardWrapper';
import { XmlInspectorModal } from '../modules/xml-inspector/XmlInspectorModal';
import { SmartScriptStep } from '../types/smartScript';

const { Title, Text, Paragraph } = Typography;

// 模拟的XML内容
const MOCK_XML_CONTENT = `<?xml version='1.0' encoding='UTF-8' standalone='yes' ?>
<hierarchy rotation="0">
  <node index="0" class="android.widget.FrameLayout" package="com.xingin.xhs" bounds="[0,0][1080,1920]" clickable="false">
    <node index="1" class="android.widget.LinearLayout" package="com.xingin.xhs" bounds="[0,72][1080,1920]" clickable="false">
      <node index="2" class="android.widget.TextView" package="com.xingin.xhs" text="关注" bounds="[100,150][200,200]" clickable="true" content-desc="关注按钮" />
      <node index="3" class="android.widget.TextView" package="com.xingin.xhs" text="发现" bounds="[300,150][400,200]" clickable="true" />
      <node index="4" class="android.widget.Button" package="com.xingin.xhs" text="搜索" bounds="[500,150][600,200]" clickable="true" />
    </node>
  </node>
</hierarchy>`;

// 模拟的步骤数据
const createMockStep = (elementData: any): SmartScriptStep => ({
  id: `step_${Date.now()}`,
  step_type: 'click',
  name: '点击元素',
  description: `点击${elementData.text || '元素'}`,
  enabled: true,
  order: 0,
  parameters: {
    ...elementData,
    isEnhanced: true,
    xmlContent: MOCK_XML_CONTENT,
    xmlCacheId: `xml_${Date.now()}`,
    elementSummary: {
      displayName: elementData.text || '测试元素',
      elementType: elementData.element_type,
      position: {
        x: elementData.bounds?.left || 0,
        y: elementData.bounds?.top || 0,
        width: (elementData.bounds?.right - elementData.bounds?.left) || 100,
        height: (elementData.bounds?.bottom - elementData.bounds?.top) || 50
      },
      xmlSource: `xml_${Date.now()}`,
      confidence: 0.85
    }
  }
});

export const UniversalUITestPage: React.FC = () => {
  const [showPageFinder, setShowPageFinder] = useState(false);
  const [showXmlInspector, setShowXmlInspector] = useState(false);
  const [testSteps, setTestSteps] = useState<SmartScriptStep[]>([]);

  // 处理元素选择
  const handleElementSelected = (element: any) => {
    console.log('🎯 收到选择的元素:', element);
    
    const newStep = createMockStep({
      text: element.text || '测试元素',
      element_type: element.element_type || 'TextView',
      bounds: element.bounds || { left: 100, top: 150, right: 200, bottom: 200 },
      resource_id: element.resource_id,
      content_desc: element.content_desc,
      ...element // 传递所有增强信息
    });

    setTestSteps(prev => [...prev, newStep]);
    message.success('元素已添加到步骤列表！');
  };

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Title level={2}>Universal UI 智能页面查找器测试</Title>
        <Paragraph>
          此页面用于测试Universal UI智能页面查找器的完整功能，包括：
        </Paragraph>
        <ul>
          <li>📱 手机XML布局实时读取和分析</li>
          <li>👁️ 可视化视图模拟展示</li>
          <li>🎯 用户点击选择元素</li>
          <li>📋 生成增强信息的步骤卡片</li>
          <li>🔍 XML检查器完整展示原始数据</li>
        </ul>


        <Space direction="vertical" style={{ width: '100%' }}>
          <Title level={3}>测试操作</Title>
          
          <Space>
            <Button 
              type="primary" 
              icon={<SearchOutlined />}
              onClick={() => setShowPageFinder(true)}
            >
              打开Universal UI页面查找器
            </Button>
            
            <Button 
              icon={<BugOutlined />}
              onClick={() => setShowXmlInspector(true)}
            >
              直接测试XML检查器
            </Button>
          </Space>

          <Divider />
          <Title level={4}>步骤列表</Title>
          <Space direction="vertical" style={{ width: '100%' }}>
            {testSteps.map((step, index) => (
              <SmartStepCardWrapper
                key={step.id}
                step={step}
                index={index}
                devices={[]}
                onEdit={(s) => console.log('编辑步骤', s)}
                onDelete={(id) => setTestSteps(prev => prev.filter(ss => ss.id !== id))}
                onToggle={(id) => setTestSteps(prev => prev.map(ss => ss.id === id ? { ...ss, enabled: !ss.enabled } : ss))}
              />
            ))}
          </Space>
        </Space>
      </Card>

      {/* Universal UI页面查找器 */}
      <UniversalPageFinderModal
        visible={showPageFinder}
        onClose={() => setShowPageFinder(false)}
        onElementSelected={handleElementSelected}
      />

      {/* XML检查器测试 */}
      <XmlInspectorModal
        visible={showXmlInspector}
        onClose={() => setShowXmlInspector(false)}
        xmlContent={MOCK_XML_CONTENT}
        xmlCacheId="test_xml_001"
        elementInfo={{
          text: '关注',
          element_type: 'android.widget.TextView',
          bounds: { left: 100, top: 150, right: 200, bottom: 200 },
          content_desc: '关注按钮'
        }}
        enhancedElement={null}
      />
    </div>
  );
};

export default UniversalUITestPage;