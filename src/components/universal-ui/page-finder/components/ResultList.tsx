import React from 'react';
import { Button, List, Space, Tag, Typography } from 'antd';
import type { UIElement } from '../../../../api/universalUIAPI';

const { Text } = Typography;

interface ResultListProps {
  elements: UIElement[];
  totalStats: { total: number; clickable: number; withText: number };
  onSelect: (el: UIElement) => void;
}

const ResultList: React.FC<ResultListProps> = ({ elements, totalStats, onSelect }) => {
  return (
    <>
      <Space style={{ marginBottom: 8 }}>
        <Tag color="blue">总数: {totalStats.total}</Tag>
        <Tag color="green">可点击: {totalStats.clickable}</Tag>
        <Tag color="orange">含文本: {totalStats.withText}</Tag>
      </Space>
      <List
        dataSource={elements}
        renderItem={(element) => (
          <List.Item
            key={element.id}
            actions={[
              <Button
                key="select"
                type="primary"
                size="small"
                onClick={() => onSelect(element)}
                disabled={!element.is_clickable}
              >
                选择
              </Button>,
            ]}
          >
            <List.Item.Meta
              title={
                <Space>
                  <Text strong>{element.text || element.element_type}</Text>
                  {element.is_clickable && <Tag color="green">可点击</Tag>}
                  {element.is_scrollable && <Tag color="blue">可滚动</Tag>}
                </Space>
              }
              description={
                <div>
                  <Text type="secondary">{element.content_desc || '无描述'}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    位置: ({element.bounds.left}, {element.bounds.top}) 大小: {element.bounds.right - element.bounds.left} × {element.bounds.bottom - element.bounds.top}
                  </Text>
                </div>
              }
            />
          </List.Item>
        )}
      />
    </>
  );
};

export default ResultList;
