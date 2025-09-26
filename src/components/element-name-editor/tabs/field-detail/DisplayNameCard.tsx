import React from 'react';
import { Card, Tag, Typography } from 'antd';
import { colors, textStyles } from '../uiTokens';

const { Text } = Typography;

interface DisplayNameCardProps {
  currentName: string;
  existingMapping: any;
}

export const DisplayNameCard: React.FC<DisplayNameCardProps> = ({ currentName, existingMapping }) => {
  return (
    <Card
      size="small"
      title={<span style={{ color: '#fff' }}>✏️ 自定义显示名称 <Tag color="orange">用户定义</Tag></span>}
      style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
      headStyle={{ background: colors.surfaceAlt, borderBottom: `1px solid ${colors.border}`, color: '#fff' }}
      bodyStyle={{ background: colors.surface }}
    >
      <div style={{ padding: 12, background: colors.accentInfoBg, borderRadius: 6, border: `1px solid ${colors.accentBlue}`, marginBottom: 12 }}>
        <div style={{ marginBottom: 8 }}><Text type="secondary" style={{ color: textStyles.subtle.color, fontSize: 11 }}>当前显示名称</Text></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong style={{ color: '#fff', fontSize: 16 }}>{currentName}</Text>
          <Tag color="blue" style={{ fontSize: 10 }}>{existingMapping ? '已保存' : '临时生成'}</Tag>
        </div>
        {existingMapping && (
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
            <Text style={{ color: textStyles.subtle.color, fontSize: 11 }}>使用 {existingMapping.usageCount} 次</Text>
            <Text style={{ color: textStyles.subtle.color, fontSize: 11 }}>{new Date(existingMapping.lastUsedAt).toLocaleString()}</Text>
          </div>
        )}
      </div>
      <div style={{ padding: 10, background: colors.surfaceAlt, borderRadius: 4, border: `1px solid ${colors.border}` }}>
        <Text style={{ color: textStyles.subtle.color, fontSize: 12 }}>
          <strong>💡 工作原理：</strong><br/>1. 系统使用左侧XML字段匹配识别元素<br/>2. 用户看到的是右侧自定义显示名称<br/>3. 两者完全分离，互不干扰
        </Text>
      </div>
    </Card>
  );
};
