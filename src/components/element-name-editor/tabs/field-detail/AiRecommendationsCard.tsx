import React from 'react';
import { Card, Tag } from 'antd';
import { colors } from '../uiTokens';

interface AiRecommendationsCardProps {
  recommendations: string[];
}

export const AiRecommendationsCard: React.FC<AiRecommendationsCardProps> = ({ recommendations }) => {
  return (
    <Card
      size="small"
      title={<span style={{ color: '#fff' }}>🤖 AI 优化建议 <Tag color="green">智能分析</Tag></span>}
      style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
      headStyle={{ background: colors.surfaceAlt, borderBottom: `1px solid ${colors.border}`, color: '#fff' }}
      bodyStyle={{ background: colors.surface }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {recommendations.map((rec, index) => (
          <div
            key={index}
            style={{
              padding: '8px 10px',
              borderRadius: 4,
              fontSize: 12,
              background: rec.includes('✅')
                ? '#0f4429'
                : rec.includes('⚠️')
                  ? colors.accentWarningBg
                  : rec.includes('❌')
                    ? '#5c1c1c'
                    : colors.surfaceAlt,
              border: `1px solid ${rec.includes('✅')
                ? colors.accentGreen
                : rec.includes('⚠️')
                  ? colors.accentOrange
                  : rec.includes('❌')
                    ? colors.accentRed
                    : colors.border}`,
              color: '#fff'
            }}
          >
            {rec}
          </div>
        ))}
      </div>
    </Card>
  );
};
