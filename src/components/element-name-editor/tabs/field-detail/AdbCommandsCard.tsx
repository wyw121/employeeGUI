import React from 'react';
import { Card, Tag, Typography } from 'antd';
import { colors, textStyles } from '../uiTokens';

const { Text } = Typography;

interface AdbCommandInfo {
  type: string;
  command: string;
  reliability: number; // 0-1
}

interface AdbCommandsCardProps {
  commands: AdbCommandInfo[];
}

export const AdbCommandsCard: React.FC<AdbCommandsCardProps> = ({ commands }) => {
  if (!commands || commands.length === 0) return null;
  return (
    <Card
      size="small"
      title={<span style={{ color: '#fff' }}>⚡ 推荐 ADB 命令 <Tag color="blue">{commands.length} 条</Tag></span>}
      style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
      headStyle={{ background: colors.surfaceAlt, borderBottom: `1px solid ${colors.border}`, color: '#fff' }}
      bodyStyle={{ background: colors.surface }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
        {commands.slice(0, 3).map((cmd, index) => (
          <div key={index} style={{ paddingBottom: 8, borderBottom: '1px solid #404040' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Tag color="blue">{cmd.type.toUpperCase()}</Tag>
              <Text type="secondary" style={{ fontSize: 11, color: textStyles.subtle.color }}>成功率: {(cmd.reliability * 100).toFixed(0)}%</Text>
            </div>
            <div style={{ background: colors.surfaceAlt, padding: '4px 6px', borderRadius: 3, fontFamily: 'Monaco, Consolas, monospace', fontSize: 11, wordBreak: 'break-all' }}>
              <Text copyable={{ text: cmd.command }} style={textStyles.codeValue}>{cmd.command}</Text>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
