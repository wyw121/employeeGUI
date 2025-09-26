import React from 'react';
import { Card, Tag, Typography } from 'antd';
import { colors, textStyles } from '../uiTokens';

const { Text } = Typography;

interface CachedMappingValues {
  displayName: string;
  lastUpdated: string;
  usageCount: number;
}

interface CachedMappingCardProps {
  values: CachedMappingValues | null;
}

export const CachedMappingCard: React.FC<CachedMappingCardProps> = ({ values }) => {
  if (!values) return null;
  return (
    <Card
      size="small"
      title={<span style={{ color: '#fff' }}>💾 映射缓存详情 <Tag color="purple">已存储</Tag></span>}
      style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
      headStyle={{ background: colors.surfaceAlt, borderBottom: `1px solid ${colors.border}`, color: '#fff' }}
      bodyStyle={{ background: colors.surface }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ padding: 8, background: colors.accentInfoBg, borderRadius: 4, border: `1px solid ${colors.accentBlue}` }}>
          <Text type="secondary" style={{ color: textStyles.subtle.color, fontSize: 11 }}>📝 存储的显示名称</Text>
          <div><Text strong style={{ color: '#fff', fontSize: 14 }}>{values.displayName}</Text></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#333', borderRadius: 4 }}>
          <div><Text style={{ color: textStyles.subtle.color, fontSize: 11 }}>📊 使用频次: {values.usageCount}</Text></div>
          <div><Text style={{ color: textStyles.subtle.color, fontSize: 11 }}>🕐 最后使用: {values.lastUpdated}</Text></div>
        </div>
        <div style={{ padding: 8, background: colors.surfaceAlt, borderRadius: 4, border: `1px solid ${colors.border}` }}>
          <Text style={{ color: textStyles.subtle.color, fontSize: 10 }}>💡 说明：此名称映射基于左侧XML字段特征进行匹配，当系统遇到相似特征的元素时会自动应用该显示名称。</Text>
        </div>
      </div>
    </Card>
  );
};
