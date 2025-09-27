// 循环体拖拽集成组件 - 支持拖拽步骤到循环体内

import React, { useMemo, useCallback } from "react";
import { Card, Typography, Space } from "antd";
import { DragSortContainer } from "../drag-sort/components/DragSortContainer";
import { LoopStepCard } from "../loop-control/components/LoopStepCard";
import { useDragSort } from "../drag-sort/hooks/useDragSort";
import { useLoopControl } from "../loop-control/hooks/useLoopControl";

import type {
  DraggableItem,
  DroppableArea,
  DragResult,
} from "../drag-sort/types";
import type {
  ExtendedSmartScriptStep,
  LoopConfig,
} from "../loop-control/types";

const { Title } = Typography;

export interface LoopDragIntegrationProps {
  /** 步骤列表 */
  steps: ExtendedSmartScriptStep[];
  /** 步骤更新回调 */
  onStepsChange: (steps: ExtendedSmartScriptStep[]) => void;
  /** 循环配置更新回调 */
  onLoopConfigChange?: (stepId: string, config: LoopConfig) => void;
  /** 自定义步骤渲染函数 */
  renderStep?: (
    step: ExtendedSmartScriptStep,
    isDragging?: boolean
  ) => React.ReactNode;
}

export const LoopDragIntegration: React.FC<LoopDragIntegrationProps> = ({
  steps,
  onStepsChange,
  onLoopConfigChange,
  renderStep,
}) => {
  // 转换步骤为拖拽项目
  const draggableItems: DraggableItem[] = useMemo(() => {
    return steps.map((step, index) => ({
      id: step.id,
      type: step.actionType,
      containerId: step.parentLoopId || "main",
      position: index,
      data: step,
    }));
  }, [steps]);

  // 定义拖拽区域
  const droppableAreas: DroppableArea[] = useMemo(() => {
    const areas: DroppableArea[] = [
      {
        id: "main",
        title: "主流程",
        type: "default",
        emptyText: "拖拽步骤到此处",
        backgroundColor: "#fafafa",
      },
    ];

    // 为每个循环开始步骤创建循环体区域
    steps.forEach((step) => {
      if (step.actionType === "LOOP_START") {
        areas.push({
          id: `loop-${step.id}`,
          title: `循环体 - ${step.actionName || "未命名循环"}`,
          type: "loop",
          emptyText: "拖拽步骤到循环体内",
          backgroundColor: "#f0f8ff",
          hoverBackgroundColor: "#e6f4ff",
        });
      }
    });

    return areas;
  }, [steps]);

  // 循环控制Hook
  const loopControl = useLoopControl({
    steps,
    onStepsChange,
    onConfigChange: onLoopConfigChange,
  });

  // 拖拽排序Hook
  const dragSort = useDragSort({
    initialItems: draggableItems,
    droppableAreas,
    config: {
      allowCrossContainer: true,
      allowIntoLoop: true,
      allowOutOfLoop: true,
    },
    onDragComplete: handleDragComplete,
    onValidateDrag: handleValidateDrag,
  });

  // 拖拽完成处理
  function handleDragComplete(items: DraggableItem[], result: DragResult) {
    const updatedSteps = items
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .map((item) => {
        const step = item.data as ExtendedSmartScriptStep;
        return {
          ...step,
          parentLoopId:
            item.containerId === "main"
              ? undefined
              : item.containerId?.replace("loop-", ""),
        };
      });

    onStepsChange(updatedSteps);
  }

  // 拖拽验证
  function handleValidateDrag(
    item: DraggableItem,
    targetContainer: string
  ): boolean {
    const step = item.data as ExtendedSmartScriptStep;

    // 循环开始/结束步骤不能拖入循环体
    if (
      targetContainer.startsWith("loop-") &&
      (step.actionType === "LOOP_START" || step.actionType === "LOOP_END")
    ) {
      return false;
    }

    // 不能拖入自己创建的循环体
    if (targetContainer === `loop-${step.id}`) {
      return false;
    }

    return true;
  }

  // 默认步骤渲染函数
  const defaultRenderStep = useCallback(
    (step: ExtendedSmartScriptStep, isDragging = false) => {
      if (step.actionType === "LOOP_START" || step.actionType === "LOOP_END") {
        return (
          <LoopStepCard
            step={step}
            loopConfig={loopControl.getLoopConfig(step.id)}
            onConfigChange={(config) =>
              loopControl.updateLoopConfig(step.id, config)
            }
            onRemove={() => loopControl.removeLoop(step.id)}
            style={{
              opacity: isDragging ? 0.5 : 1,
              transform: isDragging ? "rotate(5deg)" : undefined,
              cursor: isDragging ? "grabbing" : "grab",
            }}
          />
        );
      }

      // 普通步骤卡片
      return (
        <Card
          size="small"
          style={{
            marginBottom: 8,
            opacity: isDragging ? 0.5 : 1,
            transform: isDragging ? "rotate(5deg)" : undefined,
            cursor: isDragging ? "grabbing" : "grab",
            border: step.parentLoopId
              ? "2px solid #1890ff"
              : "1px solid #d9d9d9",
          }}
        >
          <Space direction="vertical" size={4} style={{ width: "100%" }}>
            <div style={{ fontWeight: 500, fontSize: "14px" }}>
              {step.actionName || step.actionType}
            </div>
            {step.actionData && (
              <div style={{ fontSize: "12px", color: "#666" }}>
                {JSON.stringify(step.actionData, null, 2)}
              </div>
            )}
            {step.parentLoopId && (
              <div style={{ fontSize: "10px", color: "#1890ff" }}>
                属于循环: {step.parentLoopId}
              </div>
            )}
          </Space>
        </Card>
      );
    },
    [loopControl]
  );

  // 渲染项目函数
  const renderItem = useCallback(
    (item: DraggableItem, isDragging = false) => {
      const step = item.data as ExtendedSmartScriptStep;
      return renderStep
        ? renderStep(step, isDragging)
        : defaultRenderStep(step, isDragging);
    },
    [renderStep, defaultRenderStep]
  );

  return (
    <div className="loop-drag-integration">
      <Title level={4} style={{ marginBottom: 16 }}>
        智能脚本编辑器 - 循环体拖拽
      </Title>

      <Space
        direction="vertical"
        size={16}
        style={{ width: "100%", marginBottom: 16 }}
      >
        <Card size="small" style={{ backgroundColor: "#f6ffed" }}>
          <Space>
            <span style={{ color: "#52c41a" }}>💡 使用提示:</span>
            <span>
              拖拽步骤到循环体内可组织执行顺序，循环开始/结束步骤不能拖入循环体
            </span>
          </Space>
        </Card>
      </Space>

      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Card>
          <Space style={{ marginBottom: 16 }}>
            <button
              onClick={() =>
                loopControl.addLoop({
                  condition: "true",
                  maxIterations: 10,
                })
              }
              style={{
                padding: "6px 12px",
                backgroundColor: "#1890ff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              + 添加循环
            </button>
            <button
              onClick={() => dragSort.reset()}
              style={{
                padding: "6px 12px",
                backgroundColor: "#f5f5f5",
                color: "#666",
                border: "1px solid #d9d9d9",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              重置布局
            </button>
          </Space>

          <DragSortContainer
            items={dragSort.items}
            droppableAreas={droppableAreas}
            onDragEnd={dragSort.handleDragEnd}
            onDragStart={() => dragSort.setDragging(true)}
            renderItem={renderItem}
            disabled={false}
          />
        </Card>
      </Space>
    </div>
  );
};

export default LoopDragIntegration;
