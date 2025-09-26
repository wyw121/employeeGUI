// StepItem Ultra Minimal Version (temporary) - remove all dynamic opacity / className logic to eliminate stale type errors
import React from 'react';
import { Card } from 'antd';

export interface StepItemData {
  id: string;
  name: string;
  step_type: string;
  description: string;
  parameters: any; // TODO: 后续细化具体参数类型
  enabled: boolean;
  parent_loop_id?: string;
}

export interface StepItemProps {
  step: StepItemData;
  index: number;
  draggingStyle?: React.CSSProperties;
  onToggle: (id: string) => void;
  // 以下为 DraggableStepCard 目前传入的扩展属性（均设为可选，暂不完全实现交互）
  currentDeviceId?: string;
  devices?: any[];
  onEdit?: (step: StepItemData) => void;
  onDelete?: (id: string) => void;
  onBatchMatch?: (id: string) => void;
  onUpdateStepParameters?: (id: string, nextParams: any) => void;
  StepTestButton?: React.ComponentType<{ step: StepItemData; deviceId?: string; disabled?: boolean }>;
  ENABLE_BATCH_MATCH?: boolean;
  onEditStepParams?: (step: StepItemData) => void;
}

export const StepItem: React.FC<StepItemProps> = ({ step, draggingStyle, onToggle, StepTestButton, currentDeviceId }) => (
  <div style={draggingStyle}>
    <Card
      size="small"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={step.enabled ? {} : { textDecoration: 'line-through', opacity: 0.6 }}>{step.name}</span>
          {!step.enabled && <span style={{ fontSize: 10, color: '#999' }}>(已禁用)</span>}
        </div>
      }
      extra={
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {StepTestButton && (
            <StepTestButton step={step} deviceId={currentDeviceId} disabled={!step.enabled} />
          )}
          <button
            type="button"
            onClick={() => onToggle(step.id)}
            style={{ fontSize: 12, padding: '2px 6px', border: '1px solid #ddd', borderRadius: 4 }}
          >
            {step.enabled ? '禁用' : '启用'}
          </button>
        </div>
      }
      style={{ touchAction: 'none' }}
      bodyStyle={{ padding: 8 }}
    >
      <div style={{ fontSize: 12, color: '#555', lineHeight: 1.4 }}>
        {step.description || <span style={{ fontStyle: 'italic', color: '#999' }}>(无描述)</span>}
      </div>
      <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 10, color: '#888' }}>
        <span style={{ background: '#f5f5f5', padding: '2px 4px', borderRadius: 4 }}>{step.step_type}</span>
        {step.parent_loop_id && (
          <span style={{ background: '#e6f0ff', color: '#1d64c2', padding: '2px 4px', borderRadius: 4 }}>loop:{step.parent_loop_id}</span>
        )}
      </div>
    </Card>
  </div>
);

export default StepItem;

/* NOTE: Ultra minimal transitional version. Will be enhanced stepwise after type baseline stabilizes. */
