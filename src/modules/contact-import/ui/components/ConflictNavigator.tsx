import React from 'react';
import { Button, Space, Typography } from 'antd';

interface Props {
  conflictIds: string[];
  currentTargetId?: string | null;
  onJump: (deviceId: string) => void;
}

const { Text } = Typography;

const ConflictNavigator: React.FC<Props> = ({ conflictIds, currentTargetId, onJump }) => {
  if (!conflictIds || conflictIds.length === 0) return null;

  const index = currentTargetId ? conflictIds.indexOf(currentTargetId) : -1;
  const canPrev = conflictIds.length > 0;
  const canNext = conflictIds.length > 0;

  const jumpPrev = () => {
    if (conflictIds.length === 0) return;
    let i = index;
    if (i <= 0) i = conflictIds.length - 1; else i = i - 1;
    onJump(conflictIds[i]);
  };

  const jumpNext = () => {
    if (conflictIds.length === 0) return;
    let i = index;
    if (i < 0 || i >= conflictIds.length - 1) i = 0; else i = i + 1;
    onJump(conflictIds[i]);
  };

  return (
    <Space size={8} style={{ marginBottom: 8 }}>
      <Text type="danger">冲突设备：{conflictIds.length} 台</Text>
      <Button size="small" disabled={!canPrev} onClick={jumpPrev}>上一处</Button>
      <Button size="small" disabled={!canNext} onClick={jumpNext}>下一处</Button>
    </Space>
  );
};

export default ConflictNavigator;
