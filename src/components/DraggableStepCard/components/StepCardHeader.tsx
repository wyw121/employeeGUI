import React from 'react';
import { Button, Space, Switch, Tag, Typography, Popconfirm, message } from 'antd';
import { DragOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import { InfoBubble } from './InfoBubble';
import { SmartScrollControls } from '../components/SmartScrollControls';
import type { StepTypeStyle } from '../styles/stepTypeStyles';
import type { ActionConfig } from '../constants/actionConfigs';
import { TitleEditor } from './TitleEditor';
import { noDragProps } from '../../universal-ui/dnd/noDrag';
import { MultiDeviceTestLauncher } from '../../step-card/MultiDeviceTestLauncher';

const { Text } = Typography;

type MinimalStep = {
  id: string;
  name: string;
  step_type: string;
  description?: string;
  parameters?: any;
  enabled?: boolean;
};

interface StepCardHeaderProps {
  step: MinimalStep;
  typeStyle: StepTypeStyle;
  config: ActionConfig;
  /** 控件色系切换：dark=黑底白字 | light=白底黑字 | inherit=不强制 */
  controlsVariant?: 'dark' | 'light' | 'inherit';
  // 标题编辑
  nameDraft: string;
  editingName: boolean;
  onBeginEditName: (e: React.MouseEvent) => void;
  onChangeNameDraft: (v: string) => void;
  onSaveName: () => void;
  onCancelName: () => void;
  // 右上角操作
  onToggle: (stepId: string) => void;
  onEdit: (step: MinimalStep) => void;
  onDelete: (stepId: string) => void;
  // 设备/测试
  currentDeviceId?: string;
  devices: any[];
  StepTestButton?: React.ComponentType<{ step: MinimalStep; deviceId?: string; disabled?: boolean }>;
  // 额外能力
  onOpenLoopConfig?: () => void;
  isInfiniteLoop?: boolean;
  loopCount?: number;
  onPrimaryEdit?: () => void; // 修改参数或打开分析器
  // InfoBubble
  boundNode: any;
  snapshotAvailable: boolean;
  onOpenXmlInspector: () => void;
  // smart scroll
  onUpdateStepParameters?: (id: string, nextParams: any) => void;
}

export const StepCardHeader: React.FC<StepCardHeaderProps> = ({
  step,
  typeStyle,
  config,
  controlsVariant = 'inherit',
  nameDraft,
  editingName,
  onBeginEditName,
  onChangeNameDraft,
  onSaveName,
  onCancelName,
  onToggle,
  onEdit,
  onDelete,
  currentDeviceId,
  devices,
  StepTestButton,
  onOpenLoopConfig,
  isInfiniteLoop,
  loopCount,
  onPrimaryEdit,
  boundNode,
  snapshotAvailable,
  onOpenXmlInspector,
  onUpdateStepParameters,
}) => {
  return (
    <div className={`flex items-center justify-between ${typeStyle.titleBarClass || ''} ${controlsVariant === 'dark' ? 'controls-dark' : ''}`}>
      <div className="flex items-center space-x-2">
        <div className={`p-1 rounded ${step.step_type === 'loop_start' || step.step_type === 'loop_end' ? typeStyle.headerHandleClass || '' : ''}`}>
          <DragOutlined
            className={
              step.step_type === 'loop_start' || step.step_type === 'loop_end'
                ? 'text-blue-800'
                : (step as any).parent_loop_id
                ? 'text-blue-500'
                : 'text-gray-400'
            }
          />
        </div>
        <span className={step.step_type === 'loop_start' || step.step_type === 'loop_end' ? typeStyle.iconPillClass || '' : ''}>
          <Text className="text-lg">{config.icon}</Text>
        </span>

        <TitleEditor
          value={nameDraft || step.name}
          editing={editingName}
          onBeginEdit={onBeginEditName}
          onChange={onChangeNameDraft}
          onSave={onSaveName}
          onCancel={onCancelName}
          className={typeStyle.titleTextClass}
        />

        <Tag
          color={typeStyle.tagColor || (config as any).color}
          className={step.step_type === 'loop_start' || step.step_type === 'loop_end' ? typeStyle.titleTagClass || '' : undefined}
        >
          {config.name}
        </Tag>
        {!step.enabled && <Tag>已禁用</Tag>}
        {(() => { const s:any = step; return s.parent_loop_id || s.parentLoopId; })() && (
          <Tag color="blue" className="bg-blue-100 text-blue-700 border-blue-300">
            🔄 循环体内
          </Tag>
        )}

        {/* smart scroll 控件与修改参数按钮（在标题行右侧）*/}
        {step.step_type === 'smart_scroll' && onUpdateStepParameters && (
          <SmartScrollControls
            step={step as any}
            onUpdate={(partial) =>
              onUpdateStepParameters(step.id, {
                ...(step.parameters || {}),
                ...partial,
              })
            }
          />
        )}

        {step.step_type === 'smart_find_element' && (
          <Button
            className="step-action-btn"
            size="small"
            type="link"
            icon={<EyeOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onPrimaryEdit?.();
            }}
            style={{ padding: '0 4px', fontSize: 12 }}
          >
            修改参数
          </Button>
        )}
      </div>

  <Space {...noDragProps}>
        <InfoBubble step={step as any} boundNode={boundNode} snapshotAvailable={snapshotAvailable} onOpenXmlInspector={onOpenXmlInspector} />

        {(step.step_type === 'loop_start' || step.step_type === 'loop_end') && (
          <Button
            className="step-action-btn"
            size="small"
            type="text"
            icon={<ReloadOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onOpenLoopConfig?.();
            }}
            style={{ padding: '0 4px', fontSize: 12, color: isInfiniteLoop ? '#f59e0b' : '#3b82f6' }}
            title={isInfiniteLoop ? '循环次数: 无限循环 ∞' : `循环次数: ${loopCount || 3}`}
          >
            {isInfiniteLoop ? '∞' : `${loopCount || 3}次`}
          </Button>
        )}

        {StepTestButton && (
          <div onClick={(e) => e.stopPropagation()}>
            <StepTestButton
              step={step as any}
              deviceId={currentDeviceId}
              // 测试按钮自身会做设备自动选择与可用性判断，这里不再过度禁用
              disabled={step.step_type === 'loop_start' || step.step_type === 'loop_end'}
            />
          </div>
        )}

        {/* 多设备测试入口（模块化） */}
        <div onClick={(e) => e.stopPropagation()}>
          <MultiDeviceTestLauncher step={step as any} />
        </div>

        <Switch
          size="small"
          checked={!!step.enabled}
          onChange={(checked, e) => {
            e?.stopPropagation();
            onToggle(step.id);
          }}
        />

        <Button
          className="step-action-btn"
          type="text"
          size="small"
          icon={<EditOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(step);
          }}
        />

        <Popconfirm
          title="确认删除步骤"
          description="删除后无法恢复，确定要删除这个步骤吗？"
          onConfirm={(e) => {
            e?.stopPropagation();
            onDelete(step.id);
          }}
          onCancel={(e) => {
            e?.stopPropagation();
          }}
          okText="删除"
          cancelText="取消"
          okType="danger"
          placement="topRight"
        >
          <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
        </Popconfirm>
      </Space>
    </div>
  );
};

export default StepCardHeader;
