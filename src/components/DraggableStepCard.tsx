// 可拖拽的步骤卡片组件（还原旧版样式逻辑，模块化拼装）

import React, { useMemo, useState } from "react";
import { Card } from "antd";
import { useBoundNode } from "./DraggableStepCard/hooks/useBoundNode";
import LoopConfigModal from "./DraggableStepCard/components/LoopConfigModal";
import { getStepTypeStyle } from "./DraggableStepCard/styles/stepTypeStyles";
import { XmlInspectorModal } from "../modules/xml-inspector/XmlInspectorModal";
import { useCardDraggingStyle } from "./DraggableStepCard/hooks/useCardDraggingStyle";
import { usePrefersReducedMotion } from "./DraggableStepCard/hooks/usePrefersReducedMotion";
import { DEFAULT_ACTION_CONFIG, SMART_ACTION_CONFIGS } from "./DraggableStepCard/constants/actionConfigs";
import StepCardHeader from "./DraggableStepCard/components/StepCardHeader";
import StepCardBody from "./DraggableStepCard/components/StepCardBody";
 

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
    onUpdateStepMeta?: (
      id: string,
      meta: { name?: string; description?: string }
    ) => void;
    StepTestButton?: React.ComponentType<{
      step: SmartScriptStep;
      deviceId?: string;
      disabled?: boolean;
    }>;
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
  // 拖拽由外层 SortableItem 承担；本组件仅展示。
  const dragging = !!isDragging;
  const style = {} as React.CSSProperties;
  const reducedMotion = usePrefersReducedMotion();

  const handleEdit = () => {
    if (onOpenPageAnalyzer) return onOpenPageAnalyzer();
    if (onEditStepParams) return onEditStepParams(step);
    return onEdit(step);
  };
  const handleDelete = () => onDelete(step.id);
  const handleToggle = () => onToggle(step.id);

  // 内联编辑：标题与描述
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState<string>(step.name || "");
  const beginEditName = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNameDraft(step.name || "");
    setEditingName(true);
  };
  const saveName = () => {
    setEditingName(false);
    const next = (nameDraft || "").trim();
    if (next && next !== step.name) {
      onUpdateStepMeta?.(step.id, { name: next });
    }
  };
  const cancelName = () => {
    setEditingName(false);
    setNameDraft(step.name || "");
  };

  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState<string>(step.description || "");
  const beginEditDesc = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDescDraft(step.description || "");
    setEditingDesc(true);
  };
  const saveDesc = () => {
    setEditingDesc(false);
    const next = (descDraft || "").trim();
    if (next !== step.description) {
      onUpdateStepMeta?.(step.id, { description: next });
    }
  };
  const cancelDesc = () => {
    setEditingDesc(false);
    setDescDraft(step.description || "");
  };

  const config = SMART_ACTION_CONFIGS[step.step_type] || DEFAULT_ACTION_CONFIG;
  const typeStyle = getStepTypeStyle(step.step_type);

  // 控制区展示逻辑已下放到 StepCardBody 内部

  // 解析绑定节点（模块化 hook）
  const boundNode = useBoundNode(
    step.id,
    step.parameters,
    onUpdateStepParameters
  );

  // XML 检查器模态框
  const [xmlInspectorOpen, setXmlInspectorOpen] = useState(false);
  const snapshotAvailable = useMemo(() => {
    const p: any = step.parameters || {};
    const snap = p.xmlSnapshot;
    const xmlText: string | undefined = snap?.xmlContent || p?.xmlContent;
    return typeof xmlText === "string" && xmlText.trim().length > 0;
  }, [step.parameters]);

  // 循环弹窗状态
  const [isLoopConfigVisible, setIsLoopConfigVisible] = useState(false);
  const [loopCount, setLoopCount] = useState<number>(
    step.parameters?.loop_count || 3
  );
  const [isInfiniteLoop, setIsInfiniteLoop] = useState<boolean>(
    step.parameters?.is_infinite_loop || false
  );
  const handleSaveLoopConfig = () => {
    onUpdateStepParameters?.(step.id, {
      ...(step.parameters || {}),
      loop_count: loopCount,
      is_infinite_loop: isInfiniteLoop,
    });
    setIsLoopConfigVisible(false);
  };

  // 卡片 actions 与 Header 中的操作重复，故移除，统一放在 Header 区域

  // 皮肤主题：当在循环体或循环起止卡片时，支持通过 step.parameters.loopTheme 指定主题
  const isAnchor = step.step_type === 'loop_start' || step.step_type === 'loop_end';
  const isInLoop = (() => { const s:any = step; return !!(s.parent_loop_id || s.parentLoopId); })();
  const loopThemeToken: string | undefined = (() => {
    const t = (step.parameters as any)?.loopTheme;
    if (!t || typeof t !== 'string') return undefined;
    return t.trim();
  })();
  const cardThemeToken: string | undefined = (() => {
    const t = (step.parameters as any)?.cardTheme;
    if (!t || typeof t !== 'string') return undefined;
    return t.trim();
  })();
  // 🧪 测试用白色系循环样式 - 通过特殊标记启用
  const isTestWhiteLoop = step.parameters?.testWhiteLoop === true;
  
  // 🔵 独特蓝色系循环样式 - 生产环境使用
  const isUniqueBluLoop = step.parameters?.uniqueBlueLoop === true;
  
  const loopThemeClass = (isAnchor || isInLoop) && loopThemeToken ? `loop-theme-${loopThemeToken}` : '';
  const nonLoopThemeClass = (!isAnchor && !isInLoop && cardThemeToken) ? `loop-theme-${cardThemeToken}` : '';
  const nonLoopLightSurface = (!isAnchor && !isInLoop && !!cardThemeToken) ? 'light-surface' : '';
  
  // 测试白色主题类
  const testWhiteClass = isTestWhiteLoop ? 'test-white-loop' : '';
  
  // 独特蓝色主题类
  const uniqueBlueClass = isUniqueBluLoop ? 'unique-blue-loop' : '';

  return (
    <div className="w-full" style={{ touchAction: 'none' }}>
      {/* 轻微旋转/缩放的视觉反馈（尊重 reduced-motion） */}
      <div
        style={
          dragging
            ? {
                transform: reducedMotion ? undefined : "rotate(1.0deg) scale(1.006)",
                transition: reducedMotion ? undefined : "transform 40ms linear",
                willChange: "transform",
              }
            : undefined
        }
      >
        <Card
          bordered={!(step.step_type === 'loop_start' || step.step_type === 'loop_end')}
          data-loop-badge={step.step_type === 'loop_start' ? 'START' : step.step_type === 'loop_end' ? 'END' : undefined}
          className={[
            'select-none transition-shadow cursor-grab active:cursor-grabbing',
            // 🧪 测试白色主题优先级最高
            testWhiteClass,
            // 🔵 独特蓝色主题次优先级
            uniqueBlueClass,
            // 循环体内：添加 loop-surface + in-loop-step 两个类，便于独有样式和更强覆盖
            (() => { const s:any = step; return (s.parent_loop_id || s.parentLoopId) ? 'loop-surface in-loop-step' : ''; })(),
            // 循环锚点（开始/结束）卡片：同样应用 loop-surface，确保标题区按钮/文本为深色且清晰可读
            (step.step_type === 'loop_start' || step.step_type === 'loop_end') ? 'loop-surface loop-anchor' : '',
            // 循环皮肤主题类（与 loop-surface 同层附加，实现变量化换肤）
            loopThemeClass,
            // 非循环步骤的皮肤主题类（使用相同变量体系）
            nonLoopThemeClass,
            // 非循环主题时，挂载 light-surface 以启用可读性与变量驱动
            nonLoopLightSurface,
            typeStyle.cardClass,
            typeStyle.extraCardClass || '',
            dragging
              ? `ring-2 ${typeStyle.ringClass} shadow-md ${typeStyle.draggingCardClass || ''}`
        : typeStyle.hoverClass,
          ].join(' ')}
          bodyStyle={{ padding: 12 }}
          title={
            <StepCardHeader
              step={step}
              typeStyle={typeStyle}
              config={config}
              nameDraft={nameDraft}
              editingName={editingName}
              onBeginEditName={beginEditName}
              onChangeNameDraft={setNameDraft}
              onSaveName={saveName}
              onCancelName={cancelName}
              onToggle={onToggle}
              onEdit={handleEdit}
              onDelete={handleDelete}
              currentDeviceId={currentDeviceId}
              devices={devices}
              StepTestButton={StepTestButton}
              onOpenLoopConfig={() => setIsLoopConfigVisible(true)}
              isInfiniteLoop={isInfiniteLoop}
              loopCount={loopCount}
              onPrimaryEdit={handleEdit}
              boundNode={boundNode}
              snapshotAvailable={snapshotAvailable}
              onOpenXmlInspector={() => setXmlInspectorOpen(true)}
              onUpdateStepParameters={onUpdateStepParameters}
            />
          }
        >
          <StepCardBody
            step={step}
            typeStyle={typeStyle}
            descDraft={descDraft}
            editingDesc={editingDesc}
            onBeginEditDesc={beginEditDesc}
            onChangeDescDraft={setDescDraft}
            onSaveDesc={saveDesc}
            onCancelDesc={cancelDesc}
            onUpdateStepParameters={onUpdateStepParameters}
            onBatchMatch={onBatchMatch}
            ENABLE_BATCH_MATCH={ENABLE_BATCH_MATCH}
            devices={devices}
          />

          <div className="text-xs text-gray-400 mt-2">
            步骤 #{index + 1} | 类型: {config.category} | 参数: {Object.keys(step.parameters || {}).length} 个
          </div>
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
          return (
            p?.xmlSnapshot?.xmlCacheId || p?.xmlCacheId || `xml_${step.id}`
          );
        })()}
        elementInfo={(() => {
          const p: any = step.parameters || {};
          const matching = p?.matching || {};
          const v = matching.values || {};
          const bounds = v["bounds"] || p.bounds;
          let parsedBounds: any = undefined;
          if (bounds && typeof bounds === "string") {
            const m = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
            if (m) {
              parsedBounds = {
                left: Number(m[1]),
                top: Number(m[2]),
                right: Number(m[3]),
                bottom: Number(m[4]),
              };
            }
          } else if (bounds && typeof bounds === "object") {
            parsedBounds = bounds;
          }
          return {
            text: v["text"] || p.text,
            element_type: v["class"] || p.class_name,
            bounds: parsedBounds,
            resource_id: v["resource-id"] || p.resource_id,
            content_desc: v["content-desc"] || p.content_desc,
          };
        })()}
      />
    </div>
  );
};

export const DraggableStepCard = React.memo(DraggableStepCardInner);

export default DraggableStepCard;
