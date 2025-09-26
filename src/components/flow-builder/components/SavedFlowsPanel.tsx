import React, { useMemo } from 'react';
import { Card, Typography } from 'antd';
import { loadSavedFlows } from '../services/flowPersistence';

const { Text } = Typography;

export const SavedFlowsPanel: React.FC = () => {
  const flows = useMemo(() => loadSavedFlows(), []);
  return (
    <Card title="已保存的流程" size="small" style={{ marginTop: 16 }}>
      <div style={{ maxHeight: 200, overflow: 'auto' }}>
        {flows.length === 0 ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            保存的流程将在这里显示...
          </Text>
        ) : (
          <ul style={{ paddingLeft: 16, margin: 0 }}>
            {flows.map(f => (
              <li key={f.id} style={{ fontSize: 12, lineHeight: '18px' }}>
                <Text>{f.name}</Text>
                <Text type="secondary" style={{ marginLeft: 4 }}>({f.steps.length} 步)</Text>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
};
