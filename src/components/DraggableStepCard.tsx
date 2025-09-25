// 可拖拽的步骤卡片组件

import React, { useEffect, useRef, useState } from 'react';
import { Card, Button, Space, Tag, Switch, Typography, InputNumber, Modal, Divider, Popconfirm, message, Popover } from 'antd';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { open } from '@tauri-apps/plugin-dialog';
import {
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
  DragOutlined,
  ReloadOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { MatchingStrategyTag, ScrollDirectionSelector, ScrollParamsEditor } from './step-card';
// 复用网格检查器里的策略选择器与预设字段映射（通过子模块桶文件导出）
import { StrategyConfigurator } from './universal-ui/views/grid-view/panels/node-detail';
import type { MatchStrategy } from './universal-ui/views/grid-view/panels/node-detail';
import { PRESET_FIELDS, normalizeExcludes, normalizeIncludes, inferStrategyFromFields, buildFindSimilarCriteria } from './universal-ui/views/grid-view/panels/node-detail';
// 绑定解析
import { resolveBinding, createBindingFromSnapshotAndXPath } from './step-card/element-binding/helpers';
import { resolveSnapshot } from './universal-ui/views/grid-view';
// 移除独立的正/负条件编辑器，统一由表格承载

const { Text } = Typography;

// 智能操作配置（从主页面复制）
const SMART_ACTION_CONFIGS = {
  'smart_find_element': { icon: '🎯', name: '智能元素查找', color: 'blue', category: '定位' },
  'batch_match': { icon: '🔍', name: '批量匹配', color: 'purple', category: '定位' },
  'smart_click': { icon: '👆', name: '智能点击', color: 'green', category: '交互' },
  'smart_input': { icon: '✏️', name: '智能输入', color: 'orange', category: '输入' },
  'smart_scroll': { icon: '📜', name: '智能滚动', color: 'purple', category: '导航' },
  'smart_wait': { icon: '⏰', name: '智能等待', color: 'cyan', category: '控制' },
  'smart_extract': { icon: '📤', name: '智能提取', color: 'red', category: '数据' },
  'smart_verify': { icon: '✅', name: '智能验证', color: 'geekblue', category: '验证' },
  'loop_start': { icon: '🔄', name: '循环开始', color: 'blue', category: '循环' },
  'loop_end': { icon: '🏁', name: '循环结束', color: 'blue', category: '循环' },
  'generate_vcf': { icon: '📇', name: '生成VCF文件', color: 'gold', category: '通讯录' },
  'contact_import_to_device': { icon: '⚙️', name: '导入联系人到设备', color: 'orange', category: '通讯录' }
};

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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: sortableIsDragging } = useSortable({
    id: step.id,
  });
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

  const handleSelectSourceFile = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Text', extensions: ['txt'] }],
    });
    if (selected) {
      const file = Array.isArray(selected) ? selected[0] : selected;
      onUpdateStepParameters?.(step.id, {
        ...(step.parameters || {}),
        source_file_path: file,
      });
    }
  };

  const handleSelectDevice = () => {
    message.info('请在设备列表中选择目标设备');
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || sortableIsDragging ? 0.6 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  const config = SMART_ACTION_CONFIGS[step.step_type] || { 
    icon: '⚙️', 
    name: '未知操作', 
    color: 'default', 
    category: '其他' 
  };

  // 是否展示匹配策略控件：
  // 1) 这些步骤天然依赖元素匹配；2) 或步骤已存在 matching 参数
  const STRATEGY_ENABLED_TYPES = new Set<string>([
    'smart_find_element',
    'batch_match',
    'smart_click',
    'smart_input',
    'smart_verify',
    'smart_extract',
  ]);
  const showStrategyControls = STRATEGY_ENABLED_TYPES.has(step.step_type) || !!step.parameters?.matching;

  // 🆕 从 elementBinding 解析出 UiNode，用于策略编辑的“基于节点回填”体验
  // 兼容旧步骤：若缺失 elementBinding，但存在 xmlSnapshot + xpath，则自动补齐并持久化
  const [boundNode, setBoundNode] = useState<any>(null);
  const attemptedAutoBindRef = useRef<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    const p: any = step.parameters || {};

    const tryResolveFromBinding = (bindingAny: any) => {
      try {
        if (bindingAny && bindingAny.snapshot && bindingAny.locator?.xpath) {
          const resolved = resolveSnapshot({ elementBinding: bindingAny });
          if (!cancelled) setBoundNode(resolved.node);
          return true;
        }
      } catch (_) {}
      return false;
    };

    // 1) 首选现有绑定
    if (tryResolveFromBinding(p.elementBinding)) return () => { cancelled = true; };

    // 2) 若尚未尝试过自动绑定，则基于已存数据补齐一次
    if (!attemptedAutoBindRef.current) {
      attemptedAutoBindRef.current = true;
      try {
        const xpath: string | undefined = p?.elementLocator?.additionalInfo?.xpath || p?.xpath;
        const snap = p?.xmlSnapshot;
        const xmlText: string | undefined = snap?.xmlContent || p?.xmlContent;
        if (xpath && typeof xpath === 'string' && xpath.trim() && typeof xmlText === 'string' && xmlText.trim()) {
          const snapshot = {
            source: 'memory' as const,
            text: xmlText,
            sha1: snap?.xmlHash,
            capturedAt: snap?.timestamp || Date.now(),
            deviceId: snap?.deviceInfo?.deviceId || p?.deviceId,
          };
          // 先用共用解析器直接解析节点，保证本次渲染可用
          const resolved = resolveSnapshot({ xmlText: snapshot.text, xpath });
          if (!cancelled) setBoundNode(resolved.node);
          // 再尝试创建并持久化绑定（行为与原逻辑一致）
          const binding = createBindingFromSnapshotAndXPath(snapshot, xpath);
          if (binding) {
            onUpdateStepParameters?.(step.id, {
              ...p,
              elementBinding: binding,
            });
          }
        } else {
          if (!cancelled) setBoundNode(null);
        }
      } catch (_) {
        if (!cancelled) setBoundNode(null);
      }
    } else {
      // 无可用数据，清空
      setBoundNode(null);
    }

    return () => { cancelled = true; };
    // 仅在这些关键依赖变化时尝试一次自动补齐；避免因为持久化回写造成的循环
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id, step.parameters?.elementBinding, step.parameters?.xmlSnapshot, step.parameters?.elementLocator?.additionalInfo?.xpath, step.parameters?.xpath]);

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className="w-full"
    >
      <Card
        size="small"
        className={`
          transition-all duration-200
          ${sortableIsDragging ? 'shadow-lg rotate-2 scale-105' : 'hover:shadow-md'}
          cursor-grab hover:cursor-grabbing
        `}
        style={{ 
          touchAction: 'none',
          // 为循环开始和结束步骤设置特殊的蓝色主题
          ...(step.step_type === 'loop_start' || step.step_type === 'loop_end' ? {
            border: '4px solid #3b82f6',
            background: 'linear-gradient(to bottom right, #f1f5f9, #e2e8f0, #cbd5e1)',
            color: '#1e293b',
            boxShadow: sortableIsDragging ? 
              '0 20px 40px rgba(59, 130, 246, 0.6), 0 0 0 2px rgba(59, 130, 246, 0.5), 0 0 0 4px rgba(59, 130, 246, 0.3)' : 
              '0 8px 25px rgba(59, 130, 246, 0.4), 0 0 0 1px rgba(59, 130, 246, 0.2), 0 0 0 4px rgba(59, 130, 246, 0.3)',
            ...(sortableIsDragging ? {
              transform: 'rotate(2deg) scale(1.05)',
              borderColor: '#1d4ed8'
            } : {})
          } : {
            // 普通步骤的样式
            borderColor: step.enabled ? '#cbd5e1' : '#e5e7eb',
            ...((step as any).parent_loop_id ? {
              background: 'linear-gradient(to bottom right, #eff6ff, #dbeafe)',
              borderColor: '#93c5fd',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3), 0 0 0 1px rgba(59, 130, 246, 0.2)',
            } : {})
          })
        }}
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {/* 拖拽手柄 - 现在作为视觉指示器 */}
              <div className="p-1 rounded">
                <DragOutlined 
                  className={
                    step.step_type === 'loop_start' || step.step_type === 'loop_end' ? 
                      "text-blue-700" : 
                      (step as any).parent_loop_id ? "text-blue-500" : "text-gray-400"
                  } 
                />
              </div>
              
              <Text 
                className="text-lg" 
                style={{ 
                  color: step.step_type === 'loop_start' || step.step_type === 'loop_end' ? '#1e293b' : undefined 
                }}
              >
                {config.icon}
              </Text>
              <Text 
                strong 
                style={{ 
                  color: step.step_type === 'loop_start' || step.step_type === 'loop_end' ? '#1e293b' : undefined 
                }}
              >
                {step.name}
              </Text>
              <Tag color={config.color}>{config.name}</Tag>
              {!step.enabled && <Tag>已禁用</Tag>}
              {(step as any).parent_loop_id && (
                <Tag color="blue" className="bg-blue-100 text-blue-700 border-blue-300">
                  🔄 循环体内
                </Tag>
              )}

              {/* 滚动方向与参数（仅 smart_scroll）*/}
              {step.step_type === 'smart_scroll' && (
                <div
                  className="ml-2 flex items-center gap-2"
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <ScrollDirectionSelector
                    value={step.parameters?.direction ?? 'down'}
                    onChange={(dir) => onUpdateStepParameters?.(step.id, {
                      ...step.parameters,
                      direction: dir,
                    })}
                  />
                  <ScrollParamsEditor
                    value={{
                      distance: step.parameters?.distance,
                      speed_ms: step.parameters?.speed_ms,
                    }}
                    onChange={(val) => onUpdateStepParameters?.(step.id, {
                      ...step.parameters,
                      ...val,
                    })}
                  />
                </div>
              )}
              
              {/* 修改参数按钮 - 仅对智能元素查找步骤显示 */}
              {step.step_type === 'smart_find_element' && onEditStepParams && (
                <Button
                  size="small"
                  type="link"
                  icon={<EyeOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditStepParams(step);
                  }}
                  style={{ padding: '0 4px', fontSize: '12px' }}
                >
                  修改参数
                </Button>
              )}
            </div>
            
            <Space>
              {/* 循环次数设置按钮 - 对循环开始和循环结束步骤显示 */}
              {(step.step_type === 'loop_start' || step.step_type === 'loop_end') && (
                <Button
                  size="small"
                  type="text"
                  icon={<ReloadOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLoopConfigVisible(true);
                  }}
                  style={{ 
                    padding: '0 4px', 
                    fontSize: '12px',
                    color: step.parameters?.is_infinite_loop ? '#f59e0b' : '#3b82f6' 
                  }}
                  title={
                    step.parameters?.is_infinite_loop 
                      ? '循环次数: 无限循环 ∞' 
                      : `循环次数: ${step.parameters?.loop_count || 3}`
                  }
                >
                  {step.parameters?.is_infinite_loop 
                    ? '∞' 
                    : `${step.parameters?.loop_count || 3}次`
                  }
                </Button>
              )}

              {/* 测试按钮 */}
              {StepTestButton && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerDownCapture={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onMouseDownCapture={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchStartCapture={(e) => e.stopPropagation()}
                >
                  <StepTestButton 
                    step={step} 
                    deviceId={currentDeviceId}
                    disabled={!currentDeviceId || devices.filter(d => d.status === 'online').length === 0}
                  />
                </div>
              )}
              
              {/* 启用/禁用开关 */}
              <Switch
                size="small"
                checked={step.enabled}
                onChange={(checked, e) => {
                  e?.stopPropagation();
                  onToggle(step.id);
                }}
              />
              
              {/* 编辑按钮 */}
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(step);
                }}
              />
              
              {/* 删除按钮 - 添加确认对话框 */}
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
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Popconfirm 会处理确认逻辑
                  }}
                />
              </Popconfirm>
            </Space>
          </div>
        }
      >
        <div 
          className="text-sm mb-2"
          style={{ 
            color: step.step_type === 'loop_start' || step.step_type === 'loop_end' ? '#374151' : '#4b5563'
          }}
        >
          <div className="flex items-center justify-between">
            <span>{step.description}</span>
            {/* 显示匹配策略标签 + 快速切换按钮（增强：覆盖更多步骤类型或已有 matching 的步骤） */}
            { showStrategyControls && (
              <div className="flex items-center gap-1">
                <MatchingStrategyTag strategy={step.parameters?.matching?.strategy} small />
                <Popover
                  trigger={["click"]}
                  placement="bottomRight"
                  overlayInnerStyle={{ padding: 8, maxHeight: 440, overflowY: 'auto', width: 420 }}
                  content={
                    <div onClick={(e) => e.stopPropagation()} style={{ minWidth: 360 }}>
                      <StrategyConfigurator
                        node={(() => {
                          // 优先使用解析到的 boundNode
                          if (boundNode) return boundNode;
                          
                          // 如果没有 boundNode，尝试从步骤参数构建临时节点信息
                          const p = step.parameters || {};
                          const matching = p.matching as any;
                          if (matching?.values) {
                            return {
                              id: `temp-${step.id}`,
                              attrs: {
                                'resource-id': matching.values['resource-id'] || p.resource_id,
                                'text': matching.values['text'] || p.text,
                                'content-desc': matching.values['content-desc'] || p.content_desc,
                                'class': matching.values['class'] || p.class_name,
                                'bounds': matching.values['bounds'] || p.bounds,
                                'package': matching.values['package'],
                                'checkable': matching.values['checkable'],
                                'clickable': matching.values['clickable'],
                                'enabled': matching.values['enabled'],
                                'focusable': matching.values['focusable'],
                                'scrollable': matching.values['scrollable'],
                              }
                            };
                          }
                          return null;
                        })()}
                        criteria={(() => {
                          const matching = step.parameters?.matching as any;
                          console.log('🔍 [步骤卡片策略气泡] 步骤参数:', step.parameters);
                          console.log('🔍 [步骤卡片策略气泡] matching 参数:', matching);
                          
                          if (!matching) {
                            console.log('❌ [步骤卡片策略气泡] 没有 matching 参数，使用默认值');
                            return { strategy: 'standard', fields: [], values: {}, includes: {}, excludes: {} };
                          }
                          
                          // 确保包含所有必要的参数，包括正则表达式相关参数
                          const criteria = {
                            strategy: matching.strategy || 'standard',
                            fields: matching.fields || [],
                            values: matching.values || {},
                            includes: matching.includes || {},
                            excludes: matching.excludes || {},
                            // 🆕 添加正则表达式参数支持
                            ...(matching.matchMode && { matchMode: matching.matchMode }),
                            ...(matching.regexIncludes && { regexIncludes: matching.regexIncludes }),
                            ...(matching.regexExcludes && { regexExcludes: matching.regexExcludes }),
                          };
                          console.log('✅ [步骤卡片策略气泡] 构建的 criteria:', criteria);
                          return criteria;
                        })()}
                        onChange={(next) => {
                          const prev = step.parameters?.matching || {};
                          const nextParams = {
                            ...(step.parameters || {}),
                            matching: {
                              ...prev,
                              ...next,
                            },
                          };
                          onUpdateStepParameters?.(step.id, nextParams);
                        }}
                      />
                    </div>
                  }
                >
                  <Button
                    size="small"
                    type="default"
                    icon={<SettingOutlined />}
                    onClick={(e) => e.stopPropagation()}
                    title="更改匹配策略"
                    style={{ height: 24, padding: '0 8px' }}
                  >
                    策略
                  </Button>
                </Popover>
              </div>
            ) }
            
            {/* 批量匹配切换按钮 - 支持双向切换 */}
            {showStrategyControls && onBatchMatch && (
              <Button 
                size="small"
                type={step.step_type === 'batch_match' ? 'default' : 'primary'}
                ghost={step.step_type === 'smart_find_element'}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!ENABLE_BATCH_MATCH) {
                    // 使用 helper 基于当前值智能构建“找相似”匹配条件（standard 或 relaxed）
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
            )}
          </div>
          
          {/* 针对生成VCF文件步骤，添加文件选择按钮 */}
          {step.step_type === 'contact_generate_vcf' && (
            <div className="mt-2">
              <Button 
                size="small"
                type="dashed"
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectSourceFile();
                }}
                style={{ fontSize: '12px' }}
              >
                {step.parameters?.source_file_path ? '更换源文件' : '选择txt文件'}
              </Button>
              {step.parameters?.source_file_path && (
                <div className="mt-1 text-xs text-blue-600">
                  📄 {step.parameters.source_file_path.split('/').pop() || step.parameters.source_file_path.split('\\').pop()}
                </div>
              )}
            </div>
          )}
          
          {/* 针对导入联系人到设备步骤，添加设备选择按钮 */}
          {step.step_type === 'contact_import_to_device' && (
            <div className="mt-2">
              <Button 
                size="small"
                type="dashed"
                icon={<SettingOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectDevice();
                }}
                style={{ fontSize: '12px' }}
                disabled={devices.filter(d => d.status === 'online').length === 0}
              >
                {step.parameters?.selected_device_id ? '更换设备' : '选择设备'}
              </Button>
              {step.parameters?.selected_device_id && (
                <div className="mt-1 text-xs text-green-600">
                  📱 {devices.find(d => d.id === step.parameters.selected_device_id)?.name || step.parameters.selected_device_id}
                </div>
              )}
              {devices.filter(d => d.status === 'online').length === 0 && (
                <div className="mt-1 text-xs text-red-500">
                  ⚠️ 没有在线设备可选择
                </div>
              )}
            </div>
          )}
        </div>
        <div 
          className="text-xs"
          style={{ 
            color: step.step_type === 'loop_start' || step.step_type === 'loop_end' ? '#6b7280' : '#9ca3af'
          }}
        >
          步骤 #{index + 1} | 类型: {config.category} | 参数: {Object.keys(step.parameters).length} 个
        </div>
      </Card>

      {/* 循环配置弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ReloadOutlined style={{ color: '#3b82f6' }} />
            <span>
              {step.step_type === 'loop_start' 
                ? '🔄 循环开始配置' 
                : step.step_type === 'loop_end' 
                ? '🏁 循环结束配置'
                : '设置循环次数'
              }
            </span>
          </div>
        }
        open={isLoopConfigVisible}
        onOk={handleSaveLoopConfig}
        onCancel={() => {
          setIsLoopConfigVisible(false);
          setLoopCount(step.parameters?.loop_count || 3);
          setIsInfiniteLoop(step.parameters?.is_infinite_loop || false);
        }}
        okText="保存"
        cancelText="取消"
        width={400}
      >
        <div style={{ padding: '20px 0' }}>
          {/* 无限循环开关 */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Text strong>无限循环模式：</Text>
                <span style={{ fontSize: '16px' }}>∞</span>
              </div>
              <Switch
                checked={isInfiniteLoop}
                onChange={(checked) => {
                  setIsInfiniteLoop(checked);
                  if (checked) {
                    // 切换到无限循环时，设置默认值
                    setLoopCount(3);
                  }
                }}
                checkedChildren="开启"
                unCheckedChildren="关闭"
              />
            </div>
            {isInfiniteLoop && (
              <div style={{ padding: '12px', backgroundColor: '#fff7ed', borderRadius: '6px', border: '1px solid #fed7aa' }}>
                <Text type="warning" style={{ fontSize: '12px' }}>
                  ⚠️ 警告：无限循环将持续执行直到手动停止，请谨慎使用！
                </Text>
              </div>
            )}
          </div>

          <Divider />

          {/* 循环次数设置 */}
          <div style={{ marginBottom: '16px' }}>
            <Text strong>循环执行次数：</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <InputNumber
              min={1}
              max={100}
              value={loopCount}
              onChange={(value) => setLoopCount(value || 1)}
              style={{ width: '120px' }}
              addonAfter="次"
              disabled={isInfiniteLoop}
            />
            <Text type="secondary">
              {isInfiniteLoop 
                ? '已启用无限循环模式 ∞' 
                : `当前设置为执行 ${loopCount} 次`
              }
            </Text>
          </div>
          
          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '6px', border: '1px solid #bae6fd' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              💡 提示：{isInfiniteLoop 
                ? '无限循环模式下，循环体内的步骤将不断重复执行，直到手动停止或出现错误。' 
                : step.step_type === 'loop_start' 
                  ? '循环体内的所有步骤将重复执行指定次数，类似多次点击"执行智能脚本"按钮。'
                  : step.step_type === 'loop_end'
                  ? '当执行到循环结束卡片时，如果还未达到设定次数，将返回循环开始处继续执行。'
                  : '循环体内的所有步骤将重复执行指定次数。'
              }
            </Text>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DraggableStepCard;