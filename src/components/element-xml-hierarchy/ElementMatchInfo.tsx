/**
 * 元素匹配信息组件
 * 显示当前元素与XML页面中匹配元素的详细信息
 */

import React from 'react';
import { Card, Space, Tag, Typography, Row, Col, Badge, Tooltip } from 'antd';
import { 
  InfoCircleOutlined, 
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';

import type { UIElement } from '../../api/universalUIAPI';

const { Text, Title } = Typography;

interface ElementMatchInfoProps {
  /** 目标元素 */
  element: UIElement;
  /** 匹配结果 */
  sourceResult: {
    cachedPage?: any;
    matchConfidence?: number;
    matchedElementIndex?: number;
    matchedEnhancedElement?: any;
  } | null;
}

export const ElementMatchInfo: React.FC<ElementMatchInfoProps> = ({ 
  element, 
  sourceResult 
}) => {
  if (!element || !sourceResult) return null;

  const { cachedPage, matchConfidence = 0, matchedElementIndex, matchedEnhancedElement } = sourceResult;

  // 获取置信度状态
  const getConfidenceStatus = (confidence: number) => {
    if (confidence >= 0.8) return { color: 'green', icon: CheckCircleOutlined, text: '高度匹配' };
    if (confidence >= 0.5) return { color: 'orange', icon: ExclamationCircleOutlined, text: '中等匹配' };
    if (confidence > 0) return { color: 'red', icon: ExclamationCircleOutlined, text: '低度匹配' };
    return { color: 'default', icon: CloseCircleOutlined, text: '未找到匹配' };
  };

  const confidenceStatus = getConfidenceStatus(matchConfidence);
  const StatusIcon = confidenceStatus.icon;

  return (
    <Card 
      size="small" 
      style={{ marginBottom: '16px' }}
      title={
        <Space>
          <InfoCircleOutlined />
          元素匹配信息
          <Badge
            status={
              matchConfidence >= 0.8 ? 'success' :
              matchConfidence >= 0.5 ? 'warning' :
              matchConfidence > 0 ? 'error' : 'default'
            }
            text={`置信度: ${Math.round(matchConfidence * 100)}%`}
          />
        </Space>
      }
    >
      <Row gutter={16}>
        {/* 左侧：目标元素信息 */}
        <Col span={12}>
          <div className="space-y-3">
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>🎯 目标元素</Text>
              <div style={{ marginTop: '4px' }}>
                <Text strong style={{ fontSize: '14px' }}>
                  {element.text || element.resource_id || element.element_type || '未知元素'}
                </Text>
              </div>
            </div>

            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>类型</Text>
              <div style={{ marginTop: '4px' }}>
                <Tag color="blue">{element.element_type}</Tag>
                {element.is_clickable && <Tag color="green">可点击</Tag>}
              </div>
            </div>

            {element.resource_id && (
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>资源ID</Text>
                <div style={{ marginTop: '4px' }}>
                  <Text code style={{ fontSize: '11px' }}>
                    {element.resource_id}
                  </Text>
                </div>
              </div>
            )}

            {element.content_desc && (
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>内容描述</Text>
                <div style={{ marginTop: '4px' }}>
                  <Text style={{ fontSize: '12px' }}>
                    {element.content_desc}
                  </Text>
                </div>
              </div>
            )}
          </div>
        </Col>

        {/* 右侧：匹配结果信息 */}
        <Col span={12}>
          <div className="space-y-3">
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>📄 来源页面</Text>
              <div style={{ marginTop: '4px' }}>
                <Text strong style={{ fontSize: '14px' }}>
                  {cachedPage?.pageTitle || '未找到匹配页面'}
                </Text>
                {cachedPage && (
                  <div style={{ marginTop: '2px' }}>
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      {cachedPage.deviceId} • {new Date(cachedPage.createdAt).toLocaleString()}
                    </Text>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>匹配状态</Text>
              <div style={{ marginTop: '4px' }}>
                <Space>
                  <Tag 
                    color={confidenceStatus.color} 
                    icon={<StatusIcon />}
                  >
                    {confidenceStatus.text}
                  </Tag>
                  <Tooltip title={`匹配算法基于文本、资源ID、元素类型等多个维度计算相似度`}>
                    <Tag style={{ cursor: 'help' }}>
                      {Math.round(matchConfidence * 100)}% 相似度
                    </Tag>
                  </Tooltip>
                </Space>
              </div>
            </div>

            {matchedElementIndex !== undefined && matchedElementIndex >= 0 && (
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>位置信息</Text>
                <div style={{ marginTop: '4px' }}>
                  <Tag color="blue">
                    页面第 {matchedElementIndex + 1} 个元素
                  </Tag>
                </div>
              </div>
            )}

            {matchedEnhancedElement && (
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>增强信息</Text>
                <div style={{ marginTop: '4px' }}>
                  <Space wrap>
                    {matchedEnhancedElement.userFriendlyName && (
                      <Tag color="purple" style={{ fontSize: '10px' }}>
                        {matchedEnhancedElement.userFriendlyName}
                      </Tag>
                    )}
                    {matchedEnhancedElement.category && (
                      <Tag color="cyan" style={{ fontSize: '10px' }}>
                        {matchedEnhancedElement.category}
                      </Tag>
                    )}
                    {matchedEnhancedElement.importance && (
                      <Tag 
                        color={
                          matchedEnhancedElement.importance === 'high' ? 'red' :
                          matchedEnhancedElement.importance === 'medium' ? 'orange' : 'default'
                        }
                        style={{ fontSize: '10px' }}
                      >
                        {matchedEnhancedElement.importance} 重要度
                      </Tag>
                    )}
                  </Space>
                </div>
              </div>
            )}
          </div>
        </Col>
      </Row>

      {/* 底部：匹配详情提示 */}
      {matchConfidence > 0 && (
        <div style={{ 
          marginTop: '12px', 
          padding: '8px', 
          backgroundColor: '#f6f8fa', 
          borderRadius: '4px',
          borderLeft: `3px solid ${
            matchConfidence >= 0.8 ? '#52c41a' :
            matchConfidence >= 0.5 ? '#faad14' : '#ff4d4f'
          }`
        }}>
          <Text style={{ fontSize: '11px', color: '#666' }}>
            💡 
            {matchConfidence >= 0.8 && '高置信度匹配，XML层级结构数据高度可信'}
            {matchConfidence >= 0.5 && matchConfidence < 0.8 && '中等置信度匹配，层级结构仅供参考'}
            {matchConfidence < 0.5 && '低置信度匹配，建议手动选择其他页面'}
          </Text>
        </div>
      )}
    </Card>
  );
};

export default ElementMatchInfo;