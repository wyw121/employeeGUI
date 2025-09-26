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
    category: '其他',
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

  // 🆕 从 elementBinding 解析出 UiNode，用于策略编辑的"基于节点回填"体验
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
    <div ref={setNodeRef} style={style} className="w-full">
      <Card
        size="small"
        title={title}
        actions={actions}
        style={{ marginBottom: 12, cursor: sortableIsDragging ? 'grabbing' : 'grab' }}
        extra={
          <Space>
            {onUpdateStepParameters && (
              <StrategyControls
                step={step}
                boundNode={null}
                onUpdate={(nextParams) => onUpdateStepParameters(step.id, nextParams)}
              />
            )}
            <Button
              icon={<DragOutlined />}
              type="text"
              size="small"
              {...attributes}
              {...listeners}
              style={{ cursor: 'grab', color: sortableIsDragging ? '#1890ff' : '#8c8c8c' }}
              onClick={(e) => e.preventDefault()}
            />
          </Space>
        }
        bodyStyle={{ padding: 10 }}
     >
        <Space direction="vertical" style={{ width: '100%' }} size={6}>
          <Paragraph style={{ margin: 0, fontSize: 13 }}>
            <Text type="secondary">{step.description || '无描述'}</Text>
          </Paragraph>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag>{String(step.step_type)}</Tag>
            <Button size="small" onClick={handleToggle} style={{ height: 24 }}>
              {step.enabled ? '禁用' : '启用'}
            </Button>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default DraggableStepCard;