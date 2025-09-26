/**
 * 增强步骤卡片组件
 * 包含完整的元素信息和XML检查器功能
 */

import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Card, 
  Tag, 
  Button, 
  Space, 
  Typography, 
  Descriptions, 
  Tooltip,
  Badge,
  Popover
} from 'antd';
import {
  EditOutlined,
  BugOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  AndroidOutlined,
  BranchesOutlined,
  SettingOutlined,
  DragOutlined
} from '@ant-design/icons';
import { SmartScriptStep } from '../../types/smartScript';
import { EnhancedUIElement } from '../enhanced-element-info/types';
import type { ElementBinding } from '../../components/step-card/element-binding/types';
import { resolveBinding } from '../../components/step-card/element-binding/helpers';
import { parseBounds } from '../../components/universal-ui/views/grid-view/utils';
import { XmlInspectorModal } from '../xml-inspector/XmlInspectorModal';

const { Text, Paragraph } = Typography;

interface EnhancedStepCardProps {
  step: SmartScriptStep;
  onEdit: () => void;
  onTest?: () => void;
  onDelete?: () => void;
  isDragging?: boolean;
}

export const EnhancedStepCard: React.FC<EnhancedStepCardProps> = ({
  step,
  onEdit,
  onTest,
  onDelete,
  isDragging
}) => {
  const [showXmlInspector, setShowXmlInspector] = useState(false);

  // 设置拖拽功能
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableIsDragging,
  } = useSortable({
    id: step.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || sortableIsDragging ? 0.6 : 1,
  };

  // 🔍 获取增强元素信息（兼容多种格式）
  const enhancedElement = step.parameters?.enhancedElement as EnhancedUIElement | undefined;
  const elementSummary = step.parameters?.elementSummary;
  const xmlSnapshot = step.parameters?.xmlSnapshot as { xmlContent: string; xmlHash?: string; timestamp?: number; deviceInfo?: any } | undefined;
  const elementBinding = step.parameters?.elementBinding as ElementBinding | undefined;
  
  // 检查是否有增强信息（兼容简化格式）
  const hasEnhancedInfo = !!(
    step.parameters?.isEnhanced ||           // 简化标识
    step.parameters?.xmlCacheId ||           // XML缓存ID
    step.parameters?.xmlContent ||           // XML内容
    enhancedElement?.xmlContext ||           // 完整增强信息
    elementSummary                           // 元素摘要
  );

  // 构建XML检查器数据（兼容不同格式）
  const xmlInspectorData = hasEnhancedInfo ? (() => {
    // 优先来源：增强元素携带的 XML
    let xmlContent = step.parameters?.xmlContent || enhancedElement?.xmlContext?.xmlSourceContent || '';
    let xmlCacheId = step.parameters?.xmlCacheId || enhancedElement?.xmlContext?.xmlCacheId || 'unknown';

    // 其次：来自 xmlSnapshot
    if ((!xmlContent || xmlContent.length === 0) && xmlSnapshot?.xmlContent) {
      xmlContent = xmlSnapshot.xmlContent;
      xmlCacheId = xmlSnapshot.xmlHash || 'snapshot';
    }

    // 基础 elementInfo
    let elementInfo: any = {
      text: step.parameters?.text || step.parameters?.element_text || '',
      element_type: step.parameters?.element_type || '',
      bounds: step.parameters?.bounds,
      resource_id: step.parameters?.resource_id,
      content_desc: step.parameters?.content_desc
    };

    // 若存在 elementBinding，尝试从快照解析并还原节点，填充分辨字段
    if (elementBinding) {
      try {
        const resolved = resolveBinding(elementBinding);
        if (resolved?.node) {
          const a = resolved.node.attrs || {};
          elementInfo = {
            text: a['text'] || elementInfo.text,
            element_type: a['class'] || elementInfo.element_type,
            bounds: (() => {
              const b = a['bounds'];
              if (!b) return elementInfo.bounds;
              const m = b.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
              if (m) {
                return { left: Number(m[1]), top: Number(m[2]), right: Number(m[3]), bottom: Number(m[4]) };
              }
              return elementInfo.bounds;
            })(),
            resource_id: a['resource-id'] || elementInfo.resource_id,
            content_desc: a['content-desc'] || elementInfo.content_desc,
          };
        }
      } catch (e) {
        // 忽略解析失败，保持现有 elementInfo
        // console.warn('resolveBinding failed: ', e);
      }
    }

    return {
      xmlContent,
      xmlCacheId,
      targetElement: enhancedElement,
      elementInfo,
    };
  })() : null;

  /**
   * 渲染元素信息摘要（兼容多种数据格式）
   */
  const renderElementSummary = () => {
    if (!hasEnhancedInfo) {
      return <Text type="secondary">基础步骤 - 无增强信息</Text>;
    }

    // 兼容不同格式获取信息
    const displayName = elementSummary?.displayName || 
                       step.parameters?.text || 
                       step.parameters?.element_text || 
                       enhancedElement?.text || 
                       '未知元素';
                       
    const elementType = elementSummary?.elementType || 
                       step.parameters?.element_type || 
                       enhancedElement?.element_type || 
                       'Unknown';
                       
    const confidence = (elementSummary?.confidence || 
                       enhancedElement?.smartAnalysis?.confidence || 
                       step.parameters?.smartAnalysis?.confidence || 
                       0) * 100;
                       
    const xmlSource = step.parameters?.xmlCacheId || 
                     elementSummary?.xmlSource || 
                     enhancedElement?.xmlContext?.xmlCacheId || 
                     'unknown';

    return (
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <Space>
          <Tag color="blue" icon={<AndroidOutlined />}>
            {elementType}
          </Tag>
          <Text strong>"{displayName}"</Text>
          {confidence > 0 && (
            <Tag color={confidence > 80 ? 'green' : confidence > 60 ? 'orange' : 'red'}>
              置信度: {Math.round(confidence)}%
            </Tag>
          )}
        </Space>
        
        <Descriptions size="small" column={2} style={{ fontSize: '12px' }}>
          {(step.parameters?.bounds || elementSummary?.position) && (
            <Descriptions.Item label="位置" span={2}>
              <Text code style={{ fontSize: '11px' }}>
                {(() => {
                  const b = step.parameters?.bounds as any;
                  if (typeof b === 'string') {
                    const pb = parseBounds(b);
                    if (pb) return `(${pb.x1}, ${pb.y1}) ${pb.w}×${pb.h}`;
                  } else if (b && typeof b === 'object') {
                    const w = b.right - b.left;
                    const h = b.bottom - b.top;
                    return `(${b.left}, ${b.top}) ${w}×${h}`;
                  }
                  return `(${elementSummary?.position?.x || 0}, ${elementSummary?.position?.y || 0}) ${elementSummary?.position?.width}×${elementSummary?.position?.height}`;
                })()}
              </Text>
            </Descriptions.Item>
          )}
          <Descriptions.Item label="XML源" span={2}>
            <Text code style={{ fontSize: '11px' }}>
              {xmlSource}
            </Text>
          </Descriptions.Item>
          {step.parameters?.deviceName && (
            <Descriptions.Item label="设备" span={2}>
              <Text style={{ fontSize: '11px' }}>
                {step.parameters.deviceName} ({step.parameters.deviceId})
              </Text>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Space>
    );
  };

  /**
   * 渲染XML上下文信息的Popover
   */
  const renderXmlContextPopover = () => {
    if (!enhancedElement) return null;

    const content = (
      <div style={{ maxWidth: 400 }}>
        <Space direction="vertical" size="small">
          <div>
            <Text strong>页面信息:</Text>
            <br />
            <Text>{enhancedElement.xmlContext.pageInfo.appName} - {enhancedElement.xmlContext.pageInfo.pageName}</Text>
          </div>
          <div>
            <Text strong>应用包名:</Text>
            <br />
            <Text code>{enhancedElement.xmlContext.packageName}</Text>
          </div>
          <div>
            <Text strong>节点路径:</Text>
            <br />
            <Text code style={{ fontSize: '11px' }}>
              {enhancedElement.nodePath.xpath}
            </Text>
          </div>
          <div>
            <Text strong>节点索引:</Text> {enhancedElement.nodePath.nodeIndex}
          </div>
          <div>
            <Text strong>采集时间:</Text>
            <br />
            <Text>{new Date(enhancedElement.xmlContext.timestamp).toLocaleString()}</Text>
          </div>
        </Space>
      </div>
    );

    return (
      <Popover content={content} title="XML上下文信息" placement="top">
        <Button 
          size="small" 
          icon={<InfoCircleOutlined />}
          type="link"
        >
          上下文
        </Button>
      </Popover>
    );
  };

  const cardTitle = (
    <Space>
      <Badge 
        status={step.enabled ? "success" : "default"} 
        text={<Text strong>{step.name}</Text>} 
      />
      {hasEnhancedInfo && (
        <Tag color="green">
          增强信息
        </Tag>
      )}
    </Space>
  );

  const cardActions = [
    <Button 
      key="edit" 
      icon={<EditOutlined />} 
      type="text" 
      onClick={onEdit}
    >
      编辑
    </Button>
  ];

  // 如果有增强信息，添加XML检查器按钮
  if (hasEnhancedInfo) {
    cardActions.unshift(
      <Tooltip key="xml" title="查看XML节点详情">
        <Button 
          icon={<BranchesOutlined />} 
          type="text"
          onClick={() => setShowXmlInspector(true)}
        >
          修改元素参数
        </Button>
      </Tooltip>
    );
  }

  if (onTest) {
    cardActions.push(
      <Button 
        key="test" 
        icon={<BugOutlined />} 
        type="text" 
        onClick={onTest}
      >
        测试
      </Button>
    );
  }

  return (
    <>
      <div ref={setNodeRef} style={style}>
        <Card
          title={cardTitle}
          actions={cardActions}
          size="small"
          style={{ 
            marginBottom: 12,
            cursor: sortableIsDragging ? 'grabbing' : 'grab'
          }}
          extra={
            <Space>
              {renderXmlContextPopover()}
              <Tag color="processing">
                #{step.order + 1}
              </Tag>
              {/* 拖拽手柄 */}
              <Button 
                icon={<DragOutlined />}
                type="text"
                size="small"
                {...attributes}
                {...listeners}
                style={{ 
                  cursor: 'grab',
                  color: sortableIsDragging ? '#1890ff' : '#8c8c8c'
                }}
              />
            </Space>
          }
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Paragraph style={{ margin: 0, fontSize: '13px' }}>
              <Text type="secondary">{step.description}</Text>
            </Paragraph>
            
            <div style={{ 
              padding: '8px', 
              backgroundColor: '#f9f9f9', 
              borderRadius: 4, 
              fontSize: '12px' 
            }}>
              {renderElementSummary()}
            </div>

            {enhancedElement?.smartDescription && (
              <div style={{ 
                marginTop: 8, 
                padding: '6px 8px', 
                backgroundColor: '#e6f7ff', 
                borderRadius: 4,
                borderLeft: '3px solid #1890ff'
              }}>
                <Text style={{ fontSize: '12px' }}>
                  💡 {enhancedElement.smartDescription}
                </Text>
              </div>
            )}
          </Space>
        </Card>
      </div>

      {/* XML检查器模态框 */}
      {xmlInspectorData && (
        <XmlInspectorModal
          visible={showXmlInspector}
          onClose={() => setShowXmlInspector(false)}
          xmlContent={xmlInspectorData.xmlContent}
          xmlCacheId={xmlInspectorData.xmlCacheId}
          elementInfo={xmlInspectorData.elementInfo}
          enhancedElement={xmlInspectorData.targetElement || null}
        />
      )}
    </>
  );
};

export default EnhancedStepCard;