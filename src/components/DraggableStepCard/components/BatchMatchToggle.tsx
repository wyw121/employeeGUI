import React from 'react';
import { Button, message } from 'antd';
import { PRESET_FIELDS, normalizeExcludes, normalizeIncludes, buildFindSimilarCriteria } from '../../universal-ui/views/grid-view/panels/node-detail';

interface BatchMatchToggleProps {
  step: any;
  ENABLE_BATCH_MATCH: boolean;
  onBatchMatch: (id: string) => void;
  onUpdateStepParameters?: (id: string, nextParams: any) => void;
}

export const BatchMatchToggle: React.FC<BatchMatchToggleProps> = ({ step, ENABLE_BATCH_MATCH, onBatchMatch, onUpdateStepParameters }) => {
  return (
    <Button 
      size="small"
      type={step.step_type === 'batch_match' ? 'default' : 'primary'}
      ghost={step.step_type === 'smart_find_element'}
      onClick={(e) => {
        e.stopPropagation();
        if (!ENABLE_BATCH_MATCH) {
          const prevMatching = step.parameters?.matching || {};
          const values: Record<string, any> = (prevMatching.values || {}) as Record<string, any>;
          const criteria = buildFindSimilarCriteria(values as Record<string, string>);
          const preset = PRESET_FIELDS[criteria.strategy as any] || [];
          const candidateFields = (criteria.fields && criteria.fields.length > 0) ? criteria.fields : preset;
          const normalizedExcludes = normalizeExcludes(prevMatching.excludes || criteria.excludes || {}, candidateFields);
          const normalizedIncludes = normalizeIncludes({ ...(prevMatching.includes || {}), ...(criteria.includes || {}) }, candidateFields);
          const nextParams = {
            ...(step.parameters || {}),
            matching: {
              ...prevMatching,
              ...criteria,
              fields: candidateFields,
              excludes: normalizedExcludes,
              includes: normalizedIncludes,
            }
          };
          onUpdateStepParameters?.(step.id, nextParams);
          message.info(`批量匹配已切换为“策略”路径：${criteria.strategy === 'relaxed' ? '宽松匹配' : '标准匹配'}`);
          return;
        }
        onBatchMatch(step.id);
      }}
      style={{ 
        fontSize: '12px',
        height: '24px',
        padding: '0 8px',
        marginLeft: '8px',
        ...(step.step_type === 'batch_match' ? {
          borderColor: '#722ed1',
          color: '#722ed1'
        } : {})
      }}
      title={
        step.step_type === 'smart_find_element' 
          ? '将此步骤转换为批量匹配模式，实时查找UI元素' 
          : '将此步骤切换回智能元素查找模式，使用预设坐标'
      }
    >
      {step.step_type === 'smart_find_element' ? '批量匹配' : '切回元素查找'}
    </Button>
  );
};

export default BatchMatchToggle;
