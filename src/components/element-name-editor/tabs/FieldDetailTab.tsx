import React from 'react';
import { Alert, Col, Row } from 'antd';
import { UIElement } from '../../../modules/ElementNameMapper';
import usePrecisionAnalysis from '../hooks/usePrecisionAnalysis';
import useElementNameEditorState from '../hooks/useElementNameEditorState';
// UI 令牌统一管理（避免魔法字符串 & 便于主题切换）
import { colors, textStyles } from './uiTokens';
import { FieldListCard } from './field-detail/FieldListCard';
import { DisplayNameCard } from './field-detail/DisplayNameCard';
import { CachedMappingCard } from './field-detail/CachedMappingCard';
import { AiRecommendationsCard } from './field-detail/AiRecommendationsCard';
import { AdbCommandsCard } from './field-detail/AdbCommandsCard';
import { RealtimeEditorCard } from './field-detail/RealtimeEditorCard';

// Typography alias removed after refactor (no direct Text usage here)

interface FieldDetailTabProps {
  element: UIElement;
  getCurrentDisplayName: () => string;
  existingMapping: any;
}

const FieldDetailTab: React.FC<FieldDetailTabProps> = ({ element, getCurrentDisplayName, existingMapping }) => {
  const { precisionAnalysis, sortedFields, adbCommands, cachedMapping } = usePrecisionAnalysis(element);
  const cachedValues = cachedMapping ? {
    displayName: cachedMapping.displayName,
    lastUpdated: cachedMapping.lastUpdated,
    usageCount: cachedMapping.usageCount
  } : null;

  if (!precisionAnalysis) return null;

  return (
    <div
      style={{
        padding: '16px',
        background: colors.surfaceDark,
        borderRadius: '8px',
        color: '#fff'
      }}
    >
      <Alert
        message={<div style={{ color: '#fff' }}><strong>🎯 ADB 自动化精准度: {precisionAnalysis.overallScore}%</strong></div>}
        description={<div style={{ marginTop: 8, color: textStyles.subtle.color }}>最佳策略: {precisionAnalysis.bestStrategy?.name || '暂无可用策略'}</div>}
        type={precisionAnalysis.overallScore >= 70 ? 'success' : 'warning'}
        showIcon
        style={{ background: colors.surface, border: `1px solid ${colors.border}`, color: '#fff' }}
      />

      <div style={{ marginTop: '16px' }}>
        <Row gutter={16}>
          <Col span={14}>
            <FieldListCard fields={sortedFields as any} />
          </Col>
          <Col span={10}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <DisplayNameCard currentName={getCurrentDisplayName()} existingMapping={existingMapping} />
              <CachedMappingCard values={cachedValues as any} />
              <AiRecommendationsCard recommendations={precisionAnalysis.recommendations} />
              <AdbCommandsCard commands={adbCommands as any} />
            </div>
          </Col>
        </Row>
        <RealtimeEditorCard />
      </div>
    </div>
  );
};

export default FieldDetailTab;
