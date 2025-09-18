/**
 * 已选择元素列表组件
 * 显示用户选择的元素列表
 */

import React from 'react';
import { List, Tag, Space, Typography, Button, Empty, Tooltip } from 'antd';
import { DeleteOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { UIElementEntity } from '../../domain/page-analysis';
import { usePageAnalysis } from '../../application/page-analysis';

const { Text } = Typography;

export interface SelectedElementsListProps {
  selectedElements: UIElementEntity[];
  onElementAction?: (elementId: string, action: string) => void;
}

export const SelectedElementsList: React.FC<SelectedElementsListProps> = ({
  selectedElements,
  onElementAction,
}) => {
  const { deselectElement, clearSelectedElements } = usePageAnalysis();

  if (selectedElements.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="暂无选中的元素"
        style={{ margin: '20px 0' }}
      />
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong>已选择 {selectedElements.length} 个元素</Text>
        <Button 
          type="text" 
          size="small" 
          onClick={clearSelectedElements}
          style={{ color: '#ff4d4f' }}
        >
          清空
        </Button>
      </div>

      <List
        size="small"
        dataSource={selectedElements}
        renderItem={(element) => (
          <List.Item
            style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}
            actions={[
              <Tooltip title="移除">
                <Button 
                  type="text" 
                  size="small" 
                  icon={<DeleteOutlined />}
                  onClick={() => deselectElement(element.id)}
                  danger
                />
              </Tooltip>,
              <Tooltip title="执行操作">
                <Button 
                  type="text" 
                  size="small" 
                  icon={<ThunderboltOutlined />}
                  onClick={() => onElementAction?.(element.id, 'click')}
                />
              </Tooltip>,
            ]}
          >
            <div style={{ width: '100%' }}>
              <div style={{ marginBottom: 4 }}>
                <Text strong style={{ fontSize: '12px' }}>
                  {element.text || '无文本'}
                </Text>
              </div>
              
              <div style={{ marginBottom: 4 }}>
                <Space>
                  <Tag color="blue" style={{ fontSize: '10px', margin: 0 }}>
                    {element.elementType.replace('_', ' ')}
                  </Tag>
                  
                  {element.isClickable && (
                    <Tag color="green" style={{ fontSize: '10px', margin: 0 }}>
                      可点击
                    </Tag>
                  )}
                  
                  {element.isEditable && (
                    <Tag color="orange" style={{ fontSize: '10px', margin: 0 }}>
                      可编辑
                    </Tag>
                  )}
                </Space>
              </div>
              
              <Text 
                type="secondary" 
                style={{ fontSize: '11px' }}
                ellipsis={{ tooltip: element.description }}
              >
                {element.description}
              </Text>
            </div>
          </List.Item>
        )}
      />
    </div>
  );
};