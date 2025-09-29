import React, { useState } from 'react';
import { Button, Card, Typography, Space, message, Row, Col } from 'antd';
import { useAdb } from '../application/hooks/useAdb';
import { AppSelectorDetector } from '../modules/contact-import/automation/detectors/AppSelectorDetector';
import { AppSelectorDialog } from '../modules/contact-import/automation/types/DialogTypes';
import { invoke } from '@tauri-apps/api/core';

const { Title, Text } = Typography;

/**
 * 测试命令修复页面 - 专门测试应用选择器检测
 */
export const TestCommandFix: React.FC = () => {
  const { selectedDevice } = useAdb();
  const [isDetecting, setIsDetecting] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [detectionResult, setDetectionResult] = useState<any>(null);
  const [xmlContent, setXmlContent] = useState<string>('');

  /**
   * 应用选择器检测器配置
   */
  const appSelectorConfig: AppSelectorDialog = {
    titleText: '使用以下方式打开',
    package: 'com.hihonor.android.internal.app',
    onceButtonId: 'android:id/button_once',
    alwaysButtonId: 'android:id/button_always', 
    targetButtonText: '仅此一次'
  };

  const detector = new AppSelectorDetector(appSelectorConfig);

  /**
   * 抓取XML内容
   */
  const captureXml = async () => {
    if (!selectedDevice) {
      message.error('请先选择设备');
      return;
    }

    setIsDetecting(true);
    try {
      console.log('🔍 开始抓取UI XML...');
      
      const xml = await invoke('adb_dump_ui_xml', { 
        deviceId: selectedDevice.id 
      }) as string;
      
      console.log('📱 XML抓取成功，长度:', xml.length);
      setXmlContent(xml);
      message.success('XML抓取成功！');
      
    } catch (error) {
      console.error('XML抓取失败:', error);
      message.error(`XML抓取失败: ${error}`);
    } finally {
      setIsDetecting(false);
    }
  };

  /**
   * 测试应用选择器检测
   */
  const testDetection = async () => {
    if (!xmlContent) {
      message.error('请先抓取XML');
      return;
    }

    try {
      console.log('🎯 开始测试应用选择器检测...');
      
      // 测试检测
      const result = await detector.detect(xmlContent);
      console.log('🎯 检测结果:', result);
      
      setDetectionResult(result);
      
      if (result.detected) {
        message.success('✅ 检测到应用选择器对话框！');
        console.log('目标元素:', result.targetElement);
      } else {
        message.warning(`❌ 未检测到应用选择器对话框: ${result.message}`);
      }
      
    } catch (error) {
      console.error('检测失败:', error);
      message.error(`检测失败: ${error}`);
    }
  };

  /**
   * 测试点击"仅此一次"按钮
   */
  const testClick = async () => {
    if (!selectedDevice || !detectionResult?.targetElement) {
      message.error('请先检测到目标元素');
      return;
    }

    setIsClicking(true);
    try {
      console.log('🖱️ 开始测试点击"仅此一次"按钮...');
      
      const element = detectionResult.targetElement;
      console.log('目标元素:', element);
      
      // 尝试通过resource-id点击
      const clickResult = await invoke('adb_click_element', {
        deviceId: selectedDevice.id,
        resourceId: element.resourceId
      });
      
      console.log('点击结果:', clickResult);
      message.success('✅ 点击命令已发送！');
      
    } catch (error) {
      console.error('点击失败:', error);
      message.error(`点击失败: ${error}`);
    } finally {
      setIsClicking(false);
    }
  };

  /**
   * 分析XML内容中的关键信息
   */
  const analyzeXml = () => {
    if (!xmlContent) return null;

    const hasTitle = xmlContent.includes('使用以下方式打开');
    const hasPackage = xmlContent.includes('com.hihonor.android.internal.app');
    const hasOnceButton = xmlContent.includes('android:id/button_once');
    const hasOnceText = xmlContent.includes('仅此一次');
    const hasAlwaysButton = xmlContent.includes('android:id/button_always');
    const hasClickable = xmlContent.includes('clickable="true"');

    return {
      hasTitle,
      hasPackage, 
      hasOnceButton,
      hasOnceText,
      hasAlwaysButton,
      hasClickable,
      summary: `标题: ${hasTitle ? '✅' : '❌'} | 包名: ${hasPackage ? '✅' : '❌'} | 仅此一次按钮: ${hasOnceButton ? '✅' : '❌'} | 文本: ${hasOnceText ? '✅' : '❌'}`
    };
  };

  const xmlAnalysis = analyzeXml();

  return (
    <div style={{ padding: '20px' }}>
      <Title level={2}>应用选择器检测测试</Title>
      
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card title="设备信息">
            <Text><strong>当前设备:</strong> {selectedDevice ? selectedDevice.id : '未选择设备'}</Text>
          </Card>
        </Col>
        
        <Col span={12}>
          <Card title="操作控制">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button 
                type="primary" 
                loading={isDetecting} 
                onClick={captureXml}
                disabled={!selectedDevice}
                block
              >
                📱 抓取XML
              </Button>
              
              <Button 
                type="default" 
                onClick={testDetection}
                disabled={!xmlContent}
                block
              >
                🔍 测试检测
              </Button>
              
              <Button 
                type="default" 
                loading={isClicking} 
                onClick={testClick}
                disabled={!detectionResult?.detected}
                block
              >
                🖱️ 点击"仅此一次"
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      {xmlAnalysis && (
        <Card title="XML分析" style={{ marginTop: '16px' }}>
          <Text>{xmlAnalysis.summary}</Text>
          <div style={{ marginTop: '8px' }}>
            <Text type="secondary">
              XML长度: {xmlContent.length} 字符
            </Text>
          </div>
        </Card>
      )}

      {detectionResult && (
        <Card title="检测结果" style={{ marginTop: '16px' }}>
          <pre style={{ 
            fontSize: '12px', 
            maxHeight: '400px', 
            overflow: 'auto',
            backgroundColor: '#f5f5f5',
            padding: '12px',
            borderRadius: '4px'
          }}>
            {JSON.stringify(detectionResult, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
};

export default TestCommandFix;
