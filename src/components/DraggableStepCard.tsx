// 可拖拽的步骤卡片组件

import React from 'react';
import { Card } from 'antd';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  EditOutlined,
  DeleteOutlined,
  DragOutlined,
  ReloadOutlined,
  EyeOutlined
} from '@ant-design/icons';
// import { MatchingStrategyTag } from './step-card';
import { ScriptStepItem } from './universal-ui/script-builder/components/ScriptStepItem';

export interface SmartScriptStep {
  id: string;
  name: string;
  step_type: string;
  description: string;
  parameters: any;
  enabled: boolean;
}

export interface DraggableStepCardProps {
  /** 步骤数据 */
  step: SmartScriptStep;
  /** 步骤索引 */
  index: number;
  /** 当前设备ID */
  currentDeviceId?: string;
  /** 设备列表 */
  devices: any[];
  /** 是否正在拖拽 */
  isDragging?: boolean;
}

export const DraggableStepCard: React.FC<
  DraggableStepCardProps & {
    onEdit: (step: SmartScriptStep) => void;
    onDelete: (id: string) => void;
    onToggle: (id: string) => void;
    onBatchMatch?: (id: string) => void;
    onUpdateStepParameters?: (id: string, nextParams: any) => void;
    StepTestButton?: React.ComponentType<{ step: SmartScriptStep; deviceId?: string; disabled?: boolean }>;
    ENABLE_BATCH_MATCH?: boolean;
    onEditStepParams?: (step: SmartScriptStep) => void;
  }
> = ({
  step,
  index,
  currentDeviceId,
  devices,
  isDragging,
  onEdit,
  onDelete,
  onToggle,
  onBatchMatch,
  onUpdateStepParameters,
  StepTestButton,
  ENABLE_BATCH_MATCH = false,
  onEditStepParams,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: sortableIsDragging } = useSortable({ id: step.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || sortableIsDragging ? 0.6 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  } as React.CSSProperties;

  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className="w-full">
      <ScriptStepItem
        step={step as any}
        index={index}
        onToggle={onToggle}
        draggingStyle={style}
        StepTestButton={StepTestButton as any}
        currentDeviceId={currentDeviceId}
      />
    </div>
  );
};

export default DraggableStepCard;