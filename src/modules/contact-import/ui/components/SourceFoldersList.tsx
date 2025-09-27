import React from 'react';
import { List, Tag, Empty, Space, Typography, Button, Tooltip } from 'antd';
import { DeleteOutlined, ClearOutlined } from '@ant-design/icons';

interface Props {
  folders: string[];
  onRemove: (dir: string) => void;
  onClearAll?: () => void;
}

const { Text } = Typography;

export const SourceFoldersList: React.FC<Props> = ({ folders, onRemove, onClearAll }) => {
  if (!folders.length) {
    return <Empty description="未添加文件夹路径" />;
  }
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Space style={{ justifyContent: 'space-between', width: '100%' }}>
        <Text type="secondary">已添加 {folders.length} 个文件夹，将从这些目录递归搜索TXT文件</Text>
        {onClearAll && (
          <Tooltip title="清空全部">
            <Button size="small" icon={<ClearOutlined />} onClick={onClearAll} />
          </Tooltip>
        )}
      </Space>
      <List
        size="small"
        bordered
        dataSource={folders}
        renderItem={(dir) => (
          <List.Item
            actions={[
              <Tooltip key="delete" title="移除">
                <Button size="small" type="text" icon={<DeleteOutlined />} onClick={() => onRemove(dir)} />
              </Tooltip>,
            ]}
          >
            <Tag color="blue" style={{ marginRight: 8 }}>{dir}</Tag>
          </List.Item>
        )}
      />
    </Space>
  );
};

export default SourceFoldersList;
