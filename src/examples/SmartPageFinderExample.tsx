/**
 * Smart Page Finder 智能页面查找器使用示例
 * 展示如何在脚本构建器或其他场景中集成页面分析功能
 * 使用新的 DDD 架构实现
 */

import React, { useState } from 'react';
import { Button, Space, Card, Typography, message } from 'antd';
import { SearchOutlined, RobotOutlined } from '@ant-design/icons';
import { SmartPageFinderModal } from '../components/smart-page-finder';
import { usePageAnalysis } from '../application/page-analysis/usePageAnalysis';
import type { UIElement } from '../domain/page-analysis/entities/UIElement';

const { Title, Paragraph } = Typography;

/**
 * 智能页面查找器集成示例
 */
const SmartPageFinderExample: React.FC = () => {
  const [showFinder, setShowFinder] = useState(false);
  const [currentDeviceId, setCurrentDeviceId] = useState('127.0.0.1:5555');
  const [selectedElements, setSelectedElements] = useState<UIElement[]>([]);
  
  const { analyzeCurrentPage, isAnalyzing, currentAnalysis } = usePageAnalysis();

  // 处理页面分析请求
  const handleAnalyzePage = async () => {
    try {
      await analyzeCurrentPage(currentDeviceId);
      if (currentAnalysis) {
        message.success(`页面分析完成，发现 ${currentAnalysis.elements.length} 个元素`);
      }
    } catch (error) {
      message.error('页面分析失败');
    }
  };

  // 处理单个元素选择
  const handleElementSelected = (elementId: string, action: string) => {
    // 从当前分析结果中找到对应的元素
    if (currentAnalysis) {
      const element = currentAnalysis.elements.find(el => el.id === elementId);
      if (element) {
        setSelectedElements([...selectedElements, element]);
        message.success(`已选择元素进行 ${action} 操作`);
        console.log('选中的元素:', element, '操作:', action);
      }
    }
  };

  // 处理取消
  const handleClose = () => {
    setShowFinder(false);
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Title level={3}>Smart Page Finder 集成示例</Title>
        
        <Paragraph>
          本示例展示如何在智能脚本构建器中集成页面分析功能。
          点击"打开页面查找器"体验完整的页面元素分析、去重、分类和选择流程。
        </Paragraph>

        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 功能按钮区 */}
          <Space>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={() => setShowFinder(true)}
            >
              打开页面查找器
            </Button>
            
            <Button
              icon={<RobotOutlined />}
              onClick={handleAnalyzePage}
              loading={isAnalyzing}
            >
              快速分析当前页面
            </Button>
          </Space>

          {/* 当前分析结果 */}
          {currentAnalysis && (
            <Card size="small" title="当前页面信息">
              <p><strong>页面类型:</strong> {currentAnalysis.pageInfo?.pageType || '未知'}</p>
              <p><strong>页面标题:</strong> {currentAnalysis.pageInfo?.title || '无标题'}</p>
              <p><strong>元素总数:</strong> {currentAnalysis.elements.length}</p>
              <p><strong>可操作元素:</strong> {currentAnalysis.elements.filter(el => el.isClickable || el.isScrollable).length}</p>
            </Card>
          )}

          {/* 选中元素显示 */}
          {selectedElements.length > 0 && (
            <Card size="small" title="已选择的元素" type="inner">
              {selectedElements.map((element, index) => (
                <div key={element.id} style={{ marginBottom: '8px' }}>
                  <strong>元素 {index + 1}:</strong> {element.text || element.description || '无文本'}
                  <br />
                  <span style={{ color: '#666', fontSize: '12px' }}>
                    类型: {element.className} | 可点击: {element.isClickable ? '是' : '否'}
                  </span>
                </div>
              ))}
            </Card>
          )}
        </Space>
      </Card>

      {/* Smart Page Finder Modal */}
      <SmartPageFinderModal
        visible={showFinder}
        deviceId={currentDeviceId}
        onElementSelected={handleElementSelected}
        onClose={handleClose}
      />
    </div>
  );
};

export default SmartPageFinderExample;