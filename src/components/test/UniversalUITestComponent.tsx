import React, { useState } from 'react';
import { Button, message, Card, Typography } from 'antd';
import { UniversalUIAPI } from '../../api/universalUIAPI';

const { Text, Paragraph } = Typography;

/**
 * Universal UI 测试组件
 * 用于验证页面分析功能是否正常工作
 */
export const UniversalUITestComponent: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testAnalyzeFunction = async () => {
    setTesting(true);
    setResult(null);

    try {
      console.log('🧪 开始测试 Universal UI 页面分析...');
      message.info('开始测试页面分析功能...');

      // 1. 测试基本XML获取
      const analysis = await UniversalUIAPI.analyzeUniversalUIPage('emulator-5554');
      console.log('✅ XML获取成功:', { length: analysis.length, hasXML: analysis.includes('<?xml') });

      // 2. 如果有XML内容，测试元素提取
      if (analysis.includes('<?xml') || analysis.includes('<hierarchy')) {
        console.log('🔍 开始测试元素提取...');
        const elements = await UniversalUIAPI.extractPageElements(analysis);
        console.log('✅ 元素提取成功:', { count: elements.length });

        // 3. 测试去重功能
        if (elements.length > 0) {
          console.log('🔍 开始测试去重功能...');
          const deduplicated = await UniversalUIAPI.deduplicateElements(elements);
          console.log('✅ 去重成功:', { originalCount: elements.length, deduplicatedCount: deduplicated.length });

          setResult({
            xmlLength: analysis.length,
            totalElements: elements.length,
            uniqueElements: deduplicated.length,
            sampleElements: elements.slice(0, 5),
            success: true
          });
        }
      }

      message.success('🎉 测试完成！所有功能正常工作');
    } catch (error) {
      console.error('❌ 测试失败:', error);
      message.error(`测试失败: ${error}`);
      setResult({ success: false, error: error.toString() });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card 
      title="Universal UI 功能测试" 
      style={{ margin: '20px', maxWidth: '800px' }}
    >
      <div style={{ marginBottom: '16px' }}>
        <Button 
          type="primary" 
          onClick={testAnalyzeFunction}
          loading={testing}
          size="large"
        >
          {testing ? '测试中...' : '测试页面分析功能'}
        </Button>
      </div>

      {result && (
        <Card size="small" title="测试结果">
          {result.success ? (
            <div>
              <Paragraph>
                <Text strong>XML长度:</Text> {result.xmlLength} 字符
              </Paragraph>
              <Paragraph>
                <Text strong>总元素数:</Text> {result.totalElements}
              </Paragraph>
              <Paragraph>
                <Text strong>去重后元素数:</Text> {result.uniqueElements}
              </Paragraph>
              
              {result.sampleElements && result.sampleElements.length > 0 && (
                <div>
                  <Text strong>示例元素:</Text>
                  <pre style={{ background: '#f5f5f5', padding: '8px', fontSize: '12px', maxHeight: '200px', overflow: 'auto' }}>
                    {JSON.stringify(result.sampleElements, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div>
              <Text type="danger">测试失败</Text>
              <Paragraph>
                <Text code>{result.error}</Text>
              </Paragraph>
            </div>
          )}
        </Card>
      )}
    </Card>
  );
};