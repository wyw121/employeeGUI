import React from 'react';
import { Card, Alert, Typography, Tag } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { colors, textStyles } from '../uiTokens';

const { Text } = Typography;

export const RealtimeEditorCard: React.FC = () => {
  return (
    <Card
      size="small"
      title={<span style={{ color: '#fff' }}><EditOutlined /> 实时优化编辑 <Tag color="orange">实验功能</Tag></span>}
      style={{ marginTop: 16, background: colors.surface, border: `1px solid ${colors.border}` }}
      headStyle={{ background: colors.surfaceAlt, borderBottom: `1px solid ${colors.border}`, color: '#fff' }}
      bodyStyle={{ background: colors.surface }}
    >
      <Alert
        message={<Text style={{ color: '#fff' }}>实时编辑功能</Text>}
        description={<Text style={{ color: textStyles.subtle.color }}>修改下方字段值，系统将实时更新精准度评分和ADB命令建议。注意：这里的修改仅用于测试，不会保存到缓存中。</Text>}
        type="info"
        showIcon
        style={{ marginBottom: 12, background: colors.accentInfoBg, border: `1px solid ${colors.accentBlue}` }}
      />
      <Text type="secondary" style={{ fontSize: 12, color: textStyles.subtle.color }}>此功能正在开发中，将提供实时的字段编辑和精准度分析能力...</Text>
    </Card>
  );
};
