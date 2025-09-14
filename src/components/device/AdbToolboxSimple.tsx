import React from 'react';
import { Card, Typography, Button } from 'antd';
import { ToolOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

/**
 * 简化版ADB工具箱 - 测试UI渲染
 */
export const AdbToolbox: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Title level={2}>
          <ToolOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          ADB工具箱
        </Title>
        <Paragraph>
          ADB工具箱正在加载...
        </Paragraph>
        <Button type="primary" size="large">
          开始诊断
        </Button>
      </Card>
    </div>
  );
};

export default AdbToolbox;