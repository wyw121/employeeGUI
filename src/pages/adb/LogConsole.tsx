import React from 'react';
import { Card, Alert, Space, Button, List, Typography } from 'antd';
import { useAdbStore } from '../../application/store/adbStore';

const { Text } = Typography;

export const LogConsole: React.FC = () => {
  const lastError = useAdbStore(s => s.lastError);
  const results = useAdbStore(s => s.diagnosticResults);
  const clear = useAdbStore(s => s.clearDiagnosticResults);

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {lastError && (
        <Alert type="error" showIcon message="最近错误" description={String(lastError)} />
      )}

      <Card title="诊断结果" extra={<Button onClick={clear}>清空</Button>}>
        {results.length === 0 ? (
          <Text type="secondary">暂无诊断数据</Text>
        ) : (
          <List
            size="small"
            dataSource={results}
            renderItem={(r) => (
              <List.Item>
                <Space direction="vertical" size={0}>
                  <Text strong>{r.id}</Text>
                  <Text type="secondary">{(r as any).message || JSON.stringify(r)}</Text>
                </Space>
              </List.Item>
            )}
          />
        )}
      </Card>
    </Space>
  );
};

export default LogConsole;
