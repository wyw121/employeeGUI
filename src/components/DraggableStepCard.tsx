// 可拖拽的步骤卡片组件（还原旧版样式逻辑，模块化拼装）

import React, { useMemo, useState } from 'react';
import { Card, Space, Typography, Button, Tag, Popconfirm, Switch, message, Input } from 'antd';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  EditOutlined,
  DeleteOutlined,
  DragOutlined,
  ReloadOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { MatchingStrategyTag, ScrollDirectionSelector, ScrollParamsEditor } from './step-card';
import { StrategyControls } from './DraggableStepCard/components/StrategyControls';
import { SmartScrollControls } from './DraggableStepCard/components/SmartScrollControls';
import { BatchMatchToggle } from './DraggableStepCard/components/BatchMatchToggle';
import { InlineLoopControl } from './DraggableStepCard/components/InlineLoopControl';
import { useBoundNode } from './DraggableStepCard/hooks/useBoundNode';
import LoopConfigModal from './DraggableStepCard/components/LoopConfigModal';
import { getStepTypeStyle } from './DraggableStepCard/styles/stepTypeStyles';
import './DraggableStepCard/styles/loopTheme.css';
import { InfoBubble } from './DraggableStepCard/components/InfoBubble';
import { XmlInspectorModal } from '../modules/xml-inspector/XmlInspectorModal';
const { Text, Paragraph } = Typography;

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

const DraggableStepCardInner: React.FC<
  DraggableStepCardProps & {
    onEdit: (step: SmartScriptStep) => void;
    onDelete: (id: string) => void;
    onToggle: (id: string) => void;
    onBatchMatch?: (id: string) => void;
    onUpdateStepParameters?: (id: string, nextParams: any) => void;
    onUpdateStepMeta?: (id: string, meta: { name?: string; description?: string }) => void;
    StepTestButton?: React.ComponentType<{ step: SmartScriptStep; deviceId?: string; disabled?: boolean }>;
    ENABLE_BATCH_MATCH?: boolean;
    onEditStepParams?: (step: SmartScriptStep) => void;
    onOpenPageAnalyzer?: () => void;
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
  onUpdateStepMeta,
  StepTestButton,
  ENABLE_BATCH_MATCH = false,
  onEditStepParams,
  onOpenPageAnalyzer,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: sortableIsDragging } = useSortable({ id: step.id });
  const dragging = isDragging || sortableIsDragging;
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: dragging ? undefined : transition,
    opacity: dragging ? 0.82 : 1,
    cursor: dragging ? 'grabbing' : 'grab',
    willChange: 'transform, opacity',
    contain: 'layout paint',
    backfaceVisibility: 'hidden',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  } as React.CSSProperties;

  const handleEdit = () => {
    if (onOpenPageAnalyzer) return onOpenPageAnalyzer();
    if (onEditStepParams) return onEditStepParams(step);
    return onEdit(step);
  };
  const handleDelete = () => onDelete(step.id);
  const handleToggle = () => onToggle(step.id);

  // 内联编辑：标题与描述
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState<string>(step.name || '');
  const beginEditName = (e: React.MouseEvent) => { e.stopPropagation(); setNameDraft(step.name || ''); setEditingName(true); };
  const saveName = () => {
    setEditingName(false);
    const next = (nameDraft || '').trim();
    if (next && next !== step.name) {
      onUpdateStepMeta?.(step.id, { name: next });
    }
  };
  const cancelName = () => { setEditingName(false); setNameDraft(step.name || ''); };

  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState<string>(step.description || '');
  const beginEditDesc = (e: React.MouseEvent) => { e.stopPropagation(); setDescDraft(step.description || ''); setEditingDesc(true); };
  const saveDesc = () => {
    setEditingDesc(false);
    const next = (descDraft || '').trim();
    if (next !== step.description) {
      onUpdateStepMeta?.(step.id, { description: next });
    }
  };
  const cancelDesc = () => { setEditingDesc(false); setDescDraft(step.description || ''); };

  // 旧版样式中的配置映射（用于标题标签和分类）
  const SMART_ACTION_CONFIGS: Record<string, { icon: string; name: string; color: string; category: string }> = {
    smart_find_element: { icon: '🎯', name: '智能元素查找', color: 'blue', category: '定位' },
    batch_match: { icon: '🔍', name: '批量匹配', color: 'purple', category: '定位' },
    smart_click: { icon: '👆', name: '智能点击', color: 'green', category: '交互' },
    smart_input: { icon: '✏️', name: '智能输入', color: 'orange', category: '输入' },
    smart_scroll: { icon: '📜', name: '智能滚动', color: 'purple', category: '导航' },
    smart_wait: { icon: '⏰', name: '智能等待', color: 'cyan', category: '控制' },
    smart_extract: { icon: '📤', name: '智能提取', color: 'red', category: '数据' },
    smart_verify: { icon: '✅', name: '智能验证', color: 'geekblue', category: '验证' },
    loop_start: { icon: '🔄', name: '循环开始', color: 'blue', category: '循环' },
    loop_end: { icon: '🏁', name: '循环结束', color: 'blue', category: '循环' },
    contact_generate_vcf: { icon: '📇', name: '生成VCF文件', color: 'gold', category: '通讯录' },
    contact_import_to_device: { icon: '⚙️', name: '导入联系人到设备', color: 'orange', category: '通讯录' },
  };
  const config = SMART_ACTION_CONFIGS[step.step_type] || { icon: '⚙️', name: '未知操作', color: 'default', category: '其他' };
  const typeStyle = getStepTypeStyle(step.step_type);

  const STRATEGY_ENABLED_TYPES = new Set<string>([
    'smart_find_element',
    'batch_match',
    'smart_click',
    'smart_input',
    'smart_verify',
    'smart_extract',
  ]);
  const showStrategyControls = STRATEGY_ENABLED_TYPES.has(step.step_type) || !!step.parameters?.matching;

  // 解析绑定节点（模块化 hook）
  const boundNode = useBoundNode(step.id, step.parameters, onUpdateStepParameters);

  // XML 检查器模态框
  const [xmlInspectorOpen, setXmlInspectorOpen] = useState(false);
  const snapshotAvailable = useMemo(() => {
    const p: any = step.parameters || {};
    const snap = p.xmlSnapshot;
    const xmlText: string | undefined = snap?.xmlContent || p?.xmlContent;
    return typeof xmlText === 'string' && xmlText.trim().length > 0;
  }, [step.parameters]);

  // 循环弹窗状态
  const [isLoopConfigVisible, setIsLoopConfigVisible] = useState(false);
  const [loopCount, setLoopCount] = useState<number>(step.parameters?.loop_count || 3);
  const [isInfiniteLoop, setIsInfiniteLoop] = useState<boolean>(step.parameters?.is_infinite_loop || false);
  const handleSaveLoopConfig = () => {
    onUpdateStepParameters?.(step.id, {
      ...(step.parameters || {}),
      loop_count: loopCount,
      is_infinite_loop: isInfiniteLoop,
    });
    setIsLoopConfigVisible(false);
  };

  const actions: React.ReactNode[] = [];
  if (StepTestButton) {
    actions.push(
      <span key="test" onClick={(e) => e.stopPropagation()}>
        <StepTestButton
          step={step}
          deviceId={currentDeviceId}
          disabled={!currentDeviceId || devices.filter((d) => d.status === 'online').length === 0}
        />
      </span>
    );
  }
  actions.push(
    <Button key="toggle" type="text" size="small" onClick={(e) => { e.stopPropagation(); handleToggle(); }}>
      {step.enabled ? '禁用' : '启用'}
    </Button>
  );
  actions.push(
    <Button key="edit" type="text" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); handleEdit(); }} />
  );
  actions.push(
    <Popconfirm
      key="delete"
      title="确认删除步骤"
      description="删除后无法恢复，确定要删除这个步骤吗？"
      onConfirm={(e) => { e?.stopPropagation(); handleDelete(); }}
      onCancel={(e) => { e?.stopPropagation(); }}
      okText="删除"
      cancelText="取消"
      okType="danger"
      placement="topRight"
    >
      <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
    </Popconfirm>
  );

  return (
    <div ref={setNodeRef} style={style} className="w-full" {...attributes} {...listeners}>
      <div
        style={dragging ? { transform: 'rotate(1.3deg) scale(1.01)', transition: 'transform 40ms linear', willChange: 'transform' } : undefined}
      >
      <Card
        size="small"
        className={`${sortableIsDragging ? `ring-2 ${typeStyle.ringClass}` : typeStyle.hoverClass} ${typeStyle.cardClass} ${(typeStyle.extraCardClass && (step.step_type === 'loop_start' || step.step_type === 'loop_end')) ? typeStyle.extraCardClass : ''} ${(dragging && typeStyle.draggingCardClass && (step.step_type === 'loop_start' || step.step_type === 'loop_end')) ? typeStyle.draggingCardClass : ''}`}
        style={{ touchAction: 'none' }}
        bordered={step.step_type === 'loop_start' || step.step_type === 'loop_end' ? false : true}
        title={
          <div className={`flex items-center justify-between ${typeStyle.titleBarClass || ''}`}>
            <div className="flex items-center space-x-2">
              <div className={`p-1 rounded ${(step.step_type === 'loop_start' || step.step_type === 'loop_end') ? (typeStyle.headerHandleClass || '') : ''}`}>
                <DragOutlined className={'text-gray-400'} />
              </div>
              <span className={(step.step_type === 'loop_start' || step.step_type === 'loop_end') ? (typeStyle.iconPillClass || '') : ''}>
                <Text className="text-lg">{config.icon}</Text>
              </span>
              {editingName ? (
                <Input
                  size="small"
                  value={nameDraft}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onPressEnter={(e) => { e.stopPropagation(); saveName(); }}
                  onBlur={saveName}
                  onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); cancelName(); } }}
                  style={{ maxWidth: 220 }}
                />
              ) : (
                <Text strong className={typeStyle.titleTextClass} onDoubleClick={beginEditName} title="双击编辑标题">
                  {step.name}
                </Text>
              )}
              <Tag color={typeStyle.tagColor || (config as any).color} className={(step.step_type === 'loop_start' || step.step_type === 'loop_end') ? (typeStyle.titleTagClass || '') : undefined}>{config.name}</Tag>
              {!step.enabled && <Tag>已禁用</Tag>}
              {(step as any).parent_loop_id && (
                <Tag color="blue" className="bg-blue-100 text-blue-700 border-blue-300">🔄 循环体内</Tag>
              )}

              {step.step_type === 'smart_scroll' && onUpdateStepParameters && (
                <SmartScrollControls
                  step={step}
                  onUpdate={(partial) => onUpdateStepParameters(step.id, { ...step.parameters, ...partial })}
                />
              )}

              {step.step_type === 'smart_find_element' && (
                <Button size="small" type="link" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); handleEdit(); }} style={{ padding: '0 4px', fontSize: 12 }}>
                  修改参数
                </Button>
              )}
            </div>

            <Space>
              <InfoBubble
                step={step}
                boundNode={boundNode}
                snapshotAvailable={snapshotAvailable}
                onOpenXmlInspector={() => setXmlInspectorOpen(true)}
              />
              {(step.step_type === 'loop_start' || step.step_type === 'loop_end') && (
                <Button
                  size="small"
                  type="text"
                  icon={<ReloadOutlined />}
                  onClick={(e) => { e.stopPropagation(); setIsLoopConfigVisible(true); }}
                  style={{ padding: '0 4px', fontSize: 12, color: step.parameters?.is_infinite_loop ? '#f59e0b' : '#3b82f6' }}
                  title={step.parameters?.is_infinite_loop ? '循环次数: 无限循环 ∞' : `循环次数: ${step.parameters?.loop_count || 3}`}
                >
                  {step.parameters?.is_infinite_loop ? '∞' : `${step.parameters?.loop_count || 3}次`}
                </Button>
              )}

              {StepTestButton && (
                <div onClick={(e) => e.stopPropagation()}>
                  <StepTestButton step={step} deviceId={currentDeviceId} disabled={!currentDeviceId || devices.filter((d) => d.status === 'online').length === 0} />
                </div>
              )}

              <Switch size="small" checked={step.enabled} onChange={(checked, e) => { e?.stopPropagation(); onToggle(step.id); }} />

              <Button type="text" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); onEdit(step); }} />

              <Popconfirm
                title="确认删除步骤"
                description="删除后无法恢复，确定要删除这个步骤吗？"
                onConfirm={(e) => { e?.stopPropagation(); onDelete(step.id); }}
                onCancel={(e) => { e?.stopPropagation(); }}
                okText="删除"
                cancelText="取消"
                okType="danger"
                placement="topRight"
              >
                <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
              </Popconfirm>
            </Space>
          </div>
        }
        actions={actions}
        bodyStyle={{ padding: 10 }}
      >
        {(step.step_type === 'loop_start' || step.step_type === 'loop_end') && (typeStyle.topAccentClass || typeStyle.leftAccentClass) && (
          <>
            {typeStyle.topAccentClass ? <div className={typeStyle.topAccentClass} /> : null}
            {typeStyle.leftAccentClass ? <div className={typeStyle.leftAccentClass} /> : null}
          </>
        )}
        <div className="text-sm mb-2">
          <div className="flex items-center justify-between">
            {editingDesc ? (
              <Input.TextArea
                rows={2}
                value={descDraft}
                autoSize={{ minRows: 2, maxRows: 4 }}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setDescDraft(e.target.value)}
                onPressEnter={(e) => { e.stopPropagation(); saveDesc(); }}
                onBlur={saveDesc}
                onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); cancelDesc(); } }}
              />
            ) : (
              <span onDoubleClick={beginEditDesc} title="双击编辑描述">{step.description}</span>
            )}
            <div className="flex items-center gap-2 shrink-0">
              <InlineLoopControl stepId={step.id} parameters={step.parameters} onUpdateStepParameters={onUpdateStepParameters} />
              {showStrategyControls && onUpdateStepParameters && (
                <div className="flex items-center gap-1">
                  <StrategyControls step={step} boundNode={boundNode} onUpdate={(next) => onUpdateStepParameters(step.id, next)} />
                  {onBatchMatch && (
                    <BatchMatchToggle
                      step={step}
                      ENABLE_BATCH_MATCH={!!ENABLE_BATCH_MATCH}
                      onBatchMatch={onBatchMatch}
                      onUpdateStepParameters={onUpdateStepParameters}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {step.step_type === 'contact_generate_vcf' && (
            <div className="mt-2">
              <Button
                size="small"
                type="dashed"
                icon={<EditOutlined />}
                onClick={(e) => { e.stopPropagation(); message.info('请选择txt文件（已在旧版中实现文件选择逻辑，请在上层集成）'); }}
                style={{ fontSize: 12 }}
              >
                {step.parameters?.source_file_path ? '更换源文件' : '选择txt文件'}
              </Button>
              {step.parameters?.source_file_path && (
                <div className="mt-1 text-xs text-blue-600">📄 {(step.parameters.source_file_path.split('/').pop() || step.parameters.source_file_path.split('\\').pop())}</div>
              )}
            </div>
          )}

          {step.step_type === 'contact_import_to_device' && (
            <div className="mt-2">
              <Button
                size="small"
                type="dashed"
                icon={<EyeOutlined />}
                onClick={(e) => { e.stopPropagation(); message.info('请在设备列表中选择目标设备'); }}
                style={{ fontSize: 12 }}
                disabled={devices.filter((d) => d.status === 'online').length === 0}
              >
                {step.parameters?.selected_device_id ? '更换设备' : '选择设备'}
              </Button>
              {step.parameters?.selected_device_id && (
                <div className="mt-1 text-xs text-green-600">📱 {step.parameters.selected_device_id}</div>
              )}
              {devices.filter((d) => d.status === 'online').length === 0 && (
                <div className="mt-1 text-xs text-red-500">⚠️ 没有在线设备可选择</div>
              )}
            </div>
          )}
        </div>

        <div className="text-xs text-gray-400">步骤 #{index + 1} | 类型: {config.category} | 参数: {Object.keys(step.parameters || {}).length} 个</div>
      </Card>
      </div>

      <LoopConfigModal
        open={isLoopConfigVisible}
        stepType={step.step_type}
        loopCount={loopCount}
        isInfiniteLoop={isInfiniteLoop}
        onChangeLoopCount={(v) => setLoopCount(v)}
        onChangeInfinite={(v) => setIsInfiniteLoop(v)}
        onOk={handleSaveLoopConfig}
        onCancel={() => {
          setIsLoopConfigVisible(false);
          setLoopCount(step.parameters?.loop_count || 3);
          setIsInfiniteLoop(step.parameters?.is_infinite_loop || false);
        }}
      />

      {/* XML 检查器模态框（兼容简化模式） */}
      <XmlInspectorModal
        visible={xmlInspectorOpen}
        onClose={() => setXmlInspectorOpen(false)}
        enhancedElement={null}
        xmlContent={(() => {
          const p: any = step.parameters || {};
          return p?.xmlSnapshot?.xmlContent || p?.xmlContent;
        })()}
        xmlCacheId={(() => {
          const p: any = step.parameters || {};
          return p?.xmlSnapshot?.xmlCacheId || p?.xmlCacheId || `xml_${step.id}`;
        })()}
        elementInfo={(() => {
          const p: any = step.parameters || {};
          const matching = p?.matching || {};
          const v = matching.values || {};
          const bounds = v['bounds'] || p.bounds;
          let parsedBounds: any = undefined;
          if (bounds && typeof bounds === 'string') {
            const m = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
            if (m) {
              parsedBounds = { left: Number(m[1]), top: Number(m[2]), right: Number(m[3]), bottom: Number(m[4]) };
            }
          } else if (bounds && typeof bounds === 'object') {
            parsedBounds = bounds;
          }
          return {
            text: v['text'] || p.text,
            element_type: v['class'] || p.class_name,
            bounds: parsedBounds,
            resource_id: v['resource-id'] || p.resource_id,
            content_desc: v['content-desc'] || p.content_desc,
          };
        })()}
      />
    </div>
  );
};

export const DraggableStepCard = React.memo(DraggableStepCardInner);

export default DraggableStepCard;