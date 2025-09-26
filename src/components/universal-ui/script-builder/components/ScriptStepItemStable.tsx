// Stable renamed version to flush stale TS diagnostics of old StepItem
import React from 'react';
import { Card } from 'antd';

export interface ScriptStepItemStableData {
  id: string;
  name: string;
  step_type: string;
  description: string;
  parameters: any;
  enabled: boolean;
  parent_loop_id?: string;
}

export interface ScriptStepItemStableProps {
  step: ScriptStepItemStableData;
  index: number;
  draggingStyle?: React.CSSProperties;
  onToggle: (id: string) => void;
  currentDeviceId?: string;
  StepTestButton?: React.ComponentType<{ step: ScriptStepItemStableData; deviceId?: string; disabled?: boolean }>;
}

export const ScriptStepItemStable: React.FC<ScriptStepItemStableProps> = ({ step, draggingStyle, onToggle, StepTestButton, currentDeviceId }) => {
  const disabled = !step.enabled;
  return (
    <div style={draggingStyle}>
      <Card
        size="small"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={disabled ? { textDecoration: 'line-through', opacity: 0.55 } : undefined}>{step.name}</span>
            {disabled && <span style={{ fontSize: 10, color: '#999' }}>(已禁用)</span>}
          </div>
        }
        extra={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {StepTestButton && (
              <StepTestButton step={step} deviceId={currentDeviceId} disabled={disabled} />
            )}
            <button
              type="button"
              onClick={() => onToggle(step.id)}
              style={{ fontSize: 12, padding: '2px 6px', border: '1px solid #ddd', borderRadius: 4 }}
            >
              {disabled ? '启用' : '禁用'}
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
};

export default ScriptStepItemStable;
