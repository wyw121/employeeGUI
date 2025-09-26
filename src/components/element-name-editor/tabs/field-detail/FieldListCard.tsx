import React from 'react';
import { Card, Alert, Space, Tag, Typography } from 'antd';
import { colors, textStyles, tagStyles } from '../uiTokens';

const { Text } = Typography;

export interface FieldStability {
  level: 'high' | 'medium' | 'low';
  score?: number;
  risks?: string[];
}

export interface FieldItemData {
  key: string;
  value: any;
  stability?: FieldStability;
}

interface FieldListCardProps {
  fields: FieldItemData[];
}

export const FieldListCard: React.FC<FieldListCardProps> = ({ fields }) => {
  return (
    <Card
      size="small"
      title={
        <Space style={{ color: '#fff' }}>
          <span>🔎</span>
          原始XML字段
          <Tag color="cyan">用于匹配识别</Tag>
          <Tag color="blue">{fields.length} 个字段</Tag>
        </Space>
      }
      style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
      headStyle={{ background: colors.surfaceAlt, borderBottom: `1px solid ${colors.border}`, color: '#fff' }}
      bodyStyle={{ background: colors.surface }}
    >
      <Alert
        message={<Text style={{ color: '#fff' }}><strong>📋 字段用途说明</strong></Text>}
        description={<div style={{ color: textStyles.subtle.color, fontSize: 12, marginTop: 4 }}><Text style={{ color: textStyles.subtle.color }}>这些是从Android应用界面提取的<strong>原始XML属性</strong>，系统使用这些字段来<strong>识别和定位</strong>界面元素。字段稳定性越高，定位越准确。</Text></div>}
        type="info"
        showIcon
        style={{ marginBottom: 12, background: colors.accentInfoBg, border: `1px solid ${colors.accentBlue}` }}
      />
      <div style={{ maxHeight: 400, overflowY: 'auto' }} className="dark-scrollbar">
        {fields.map((f, index) => (
          <FieldItem key={f.key} data={f} index={index} />
        ))}
      </div>
    </Card>
  );
};

interface FieldItemProps { data: FieldItemData; index: number; }

const FieldItem: React.FC<FieldItemProps> = ({ data, index }) => {
  const { key, value, stability } = data;
  return (
    <div
      style={{
        marginBottom: 12,
        padding: 12,
        background: index < 3 ? colors.accentInfoBg : '#333',
        border: `1px solid ${stability?.level === 'high' ? colors.accentGreen : stability?.level === 'medium' ? colors.accentOrange : colors.accentRed}`,
        borderRadius: 6
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Space>
          <span style={{ background: index < 3 ? colors.accentBlue : '#666', color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 'bold' }}>#{index + 1}</span>
          <Text strong style={{ color: '#fff', fontSize: 14 }}>{key}</Text>
          <Tag color={stability?.level === 'high' ? 'green' : stability?.level === 'medium' ? 'orange' : 'red'} style={tagStyles.small}>{stability?.score || 0}% 稳定性</Tag>
        </Space>
      </div>
      <div
        style={{
          background: colors.surfaceAlt,
          padding: '8px 10px',
          borderRadius: 4,
          fontFamily: 'Monaco, Consolas, monospace',
          fontSize: 12,
          wordBreak: 'break-all',
          marginBottom: 8,
          border: `1px solid ${colors.border}`
        }}
      >
        <Text copyable={{ text: String(value) }} style={textStyles.codeValue}>{String(value)}</Text>
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {stability?.level === 'high' && <Tag color="success" style={tagStyles.small}>🔥 高价值字段</Tag>}
        {key === 'resource_id' && <Tag color="purple" style={tagStyles.small}>🎯 最佳定位</Tag>}
        {key === 'text' && value && String(value).length < 10 && <Tag color="cyan" style={tagStyles.small}>📝 精简文本</Tag>}
        {index < 3 && <Tag color="gold" style={tagStyles.small}>⭐ 推荐优先级</Tag>}
        <Tag style={{ ...tagStyles.tiny, background: colors.surfaceAlt, color: '#999' }}>匹配字段</Tag>
      </div>
      {stability && Array.isArray(stability.risks) && stability.risks.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <Text type="secondary" style={{ fontSize: 10, color: '#999' }}>
            ⚠️ 风险: {stability.risks.slice(0, 2).join(', ')}
          </Text>
        </div>
      )}
    </div>
  );
};
