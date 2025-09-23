// 可拖拽的步骤卡片组件

import React, { useState } from 'react';
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
import { MatchingStrategySelector } from './universal-ui/views/grid-view/panels/node-detail';
import type { MatchStrategy } from './universal-ui/views/grid-view/panels/node-detail';
import { PRESET_FIELDS, normalizeExcludes } from './universal-ui/views/grid-view/panels/node-detail';

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
  /** 编辑步骤回调 */
  onEdit: (step: SmartScriptStep) => void;
  /** 删除步骤回调 */
  onDelete: (stepId: string) => void;
  /** 切换启用状态回调 */
  onToggle: (stepId: string) => void;
  /** 修改参数按钮回调 - 打开页面分析器进行参数配置 */
  onOpenPageAnalyzer?: () => void;
  /** 修改步骤参数回调 */
  onEditStepParams?: (step: SmartScriptStep) => void;
  /** 测试步骤组件 */
  StepTestButton?: React.ComponentType<any>;
  /** 更新步骤参数回调 */
  onUpdateStepParameters?: (stepId: string, parameters: any) => void;
  /** 批量匹配操作回调 */
  onBatchMatch?: (stepId: string) => void;
}

export const DraggableStepCard: React.FC<DraggableStepCardProps> = ({
  step,
  index,
  currentDeviceId,
  devices,
  isDragging,
  onEdit,
  onDelete,
  onToggle,
  onOpenPageAnalyzer,
  onEditStepParams,
  StepTestButton,
  onUpdateStepParameters,
  onBatchMatch
}) => {
  // 循环次数设置状态
  const [isLoopConfigVisible, setIsLoopConfigVisible] = useState(false);
  const [loopCount, setLoopCount] = useState(step.parameters?.loop_count || 3);
  const [isInfiniteLoop, setIsInfiniteLoop] = useState(step.parameters?.is_infinite_loop || false);

  // 文件选择处理函数 - 针对VCF生成步骤
  const handleSelectSourceFile = async () => {
    try {
      const selected = await open({
        filters: [{
          name: 'Text Files',
          extensions: ['txt']
        }],
        multiple: false
      });

      if (selected && typeof selected === 'string') {
        // 更新步骤参数中的源文件路径
        if (onUpdateStepParameters) {
          onUpdateStepParameters(step.id, {
            ...step.parameters,
            source_file_path: selected
          });
          message.success(`已选择源文件: ${selected.split(/[/\\]/).pop()}`);
        }
      }
    } catch (error) {
      console.error('文件选择失败:', error);
      message.error('文件选择失败');
    }
  };

  // 选择设备
  const handleSelectDevice = () => {
    const onlineDevices = devices.filter(d => d.status === 'online');
    
    if (onlineDevices.length === 0) {
      message.warning('没有在线设备可选择');
      return;
    }

    // 如果只有一个在线设备，直接选择
    if (onlineDevices.length === 1) {
      const selectedDevice = onlineDevices[0];
      if (onUpdateStepParameters) {
        onUpdateStepParameters(step.id, {
          ...step.parameters,
          selected_device_id: selectedDevice.id
        });
        message.success(`已选择设备: ${selectedDevice.name || selectedDevice.id}`);
      }
      return;
    }

    // 多个设备时显示选择器
    Modal.confirm({
      title: '选择目标设备',
      content: (
        <div>
          <p>请选择要导入联系人的设备:</p>
          {onlineDevices.map(device => (
            <div 
              key={device.id}
              style={{
                padding: '8px 12px',
                margin: '4px 0',
                border: '1px solid #d9d9d9',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
              onClick={() => {
                if (onUpdateStepParameters) {
                  onUpdateStepParameters(step.id, {
                    ...step.parameters,
                    selected_device_id: device.id
                  });
                  message.success(`已选择设备: ${device.name || device.id}`);
                }
                Modal.destroyAll();
              }}
            >
              📱 {device.name || device.id}
              {device.id === currentDeviceId && <span style={{color: '#52c41a', marginLeft: '8px'}}>当前设备</span>}
            </div>
          ))}
        </div>
      ),
      okButtonProps: { style: { display: 'none' } },
      cancelText: '取消'
    });
  };

  // 保存循环次数
  const handleSaveLoopConfig = () => {
    if (onUpdateStepParameters) {
      onUpdateStepParameters(step.id, {
        ...step.parameters,
        loop_count: isInfiniteLoop ? -1 : loopCount, // -1 表示无限循环
        is_infinite_loop: isInfiniteLoop
      });
    }
    setIsLoopConfigVisible(false);
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableIsDragging,
  } = useSortable({
    id: step.id,
  });

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
                  overlayInnerStyle={{ padding: 8 }}
                  content={
                    <div onClick={(e) => e.stopPropagation()}>
                      <MatchingStrategySelector
                        value={(step.parameters?.matching?.strategy as MatchStrategy) || 'standard'}
                        onChange={(next: MatchStrategy) => {
                          const prevMatching = step.parameters?.matching || {};
                          const preset = PRESET_FIELDS[next as any] || [];
                          const values: Record<string, any> = prevMatching.values || {};
                          let nextFields = Array.isArray(preset)
                            ? preset.filter((f) => values[f] != null)
                            : [];
                          if (!nextFields || nextFields.length === 0) {
                            // 若选择 custom，保留原有字段；否则使用预设
                            nextFields = next === 'custom' ? (prevMatching.fields || []) : preset;
                          }

                          const baseParams = step.parameters || {};
                          // 规范化 excludes：仅保留仍被选中的字段的排除词
                          const normalizedExcludes = normalizeExcludes(prevMatching.excludes || {}, nextFields);
                          const nextParams = {
                            ...baseParams,
                            matching: {
                              ...prevMatching,
                              strategy: next,
                              fields: nextFields,
                              values,
                              excludes: normalizedExcludes,
                            },
                          };
                          onUpdateStepParameters?.(step.id, nextParams);
                          message.success(`已切换匹配策略为：${next}`);
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