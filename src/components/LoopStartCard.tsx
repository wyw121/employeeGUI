// 循环开始卡片组件 - 独特的蓝色主题

import React, { useState } from "react";
import {
  Card,
  Button,
  Input,
  Typography,
  Tag,
  Tooltip,
  Space,
  InputNumber,
  Popconfirm,
  message,
} from "antd";
import {
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
  DragOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";
import { noDragProps } from './universal-ui/dnd/noDrag';
import type { LoopConfig, ExtendedSmartScriptStep } from "../types/loopScript";
import "./DraggableStepCard/styles/loopTheme.css";

const { Text } = Typography;

export interface LoopStartCardProps {
  /** 循环步骤数据 */
  step: ExtendedSmartScriptStep;
  /** 步骤索引 */
  index: number;
  /** 循环配置 */
  loopConfig?: LoopConfig;
  /** 是否正在拖拽 */
  isDragging?: boolean;
  /** 更新循环配置回调 */
  onLoopConfigUpdate: (updates: Partial<LoopConfig>) => void;
  /** 删除循环回调 */
  onDeleteLoop: (loopId: string) => void;
  /** 切换启用状态回调 */
  onToggle: (stepId: string) => void;
}

export const LoopStartCard: React.FC<LoopStartCardProps> = ({
  step,
  index,
  loopConfig,
  isDragging,
  onLoopConfigUpdate,
  onDeleteLoop,
  onToggle,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempConfig, setTempConfig] = useState<LoopConfig>(
    loopConfig || {
      loopId: step.parameters?.loop_id || `loop_${Date.now()}`,
      name: step.parameters?.loop_name || "新循环",
      iterations: step.parameters?.loop_count || 3,
      enabled: step.enabled,
      description: step.description,
    }
  );

  // 拖拽包装由外部统一的 SortableItem 提供；本组件只关心展示
  const dragging = !!isDragging;

  const handleSaveConfig = () => {
    onLoopConfigUpdate(tempConfig);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setTempConfig(loopConfig || tempConfig);
    setIsEditing(false);
  };

  const handleDeleteLoop = () => {
    if (tempConfig.loopId) {
      onDeleteLoop(tempConfig.loopId);
      message.success(`已删除循环: ${tempConfig.name || "未命名循环"}`);
    }
  };

  return (
    <div
      className="w-full"
      style={{ touchAction: 'none', opacity: dragging ? 0.9 : 1, cursor: dragging ? 'grabbing' : 'grab' }}
    >
      {/* 🎨 独特的蓝色循环卡片设计 - 使用模块化样式系统 */}
      <Card
        size="small"
        data-loop-badge="START"
        className={`transition-all duration-300 ease-in-out cursor-grab hover:cursor-grabbing relative overflow-hidden loop-card loop-start bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 border-4 border-blue-500 rounded-2xl ${
          dragging ? "loop-card-dragging ring-2 ring-blue-500" : "hover:shadow-lg"
        }`}
        style={{
          touchAction: "none",
          ...(dragging
            ? {
                transform: "rotate(2deg) scale(1.05)",
              }
            : {}),
        }}
        bordered={false}
        title={
          <div className="bg-blue-50 bg-opacity-80 -m-2 p-3 rounded-t border-b-2 border-blue-200 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* 🎯 突出的拖拽手柄 */}
              <div className="loop-header-handle">
                <DragOutlined className="text-blue-800 text-lg font-bold" />
              </div>

              {/* 🔄 循环图标 */}
              <div className="loop-icon-pill">
                <ReloadOutlined className="text-sm" />
              </div>

              {/* 🏷️ 循环标题 */}
              <Text strong className="text-blue-900 text-lg font-bold">
                🔄 循环开始
              </Text>

              {/* 🏷️ 循环名称标签 */}
              <Tag color="blue" className="loop-title-tag font-bold px-3 py-1">
                {tempConfig.name}
              </Tag>

              {/* ❌ 禁用状态标签 */}
              {!step.enabled && (
                <Tag color="default" className="bg-gray-100 border-gray-300">
                  已禁用
                </Tag>
              )}
            </div>

            <Space size="small" {...noDragProps}>
              {/* ⚙️ 设置按钮 */}
              <Button
                type="text"
                size="small"
                className="bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100"
                icon={<SettingOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                title="编辑循环配置"
              />

              {/* 🗑️ 删除按钮 - 添加确认对话框 */}
              <Popconfirm
                title="确认删除循环"
                description="删除循环将同时删除循环内的所有步骤，此操作不可撤销"
                onConfirm={(e) => {
                  e?.stopPropagation();
                  handleDeleteLoop();
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
                  className="bg-red-50 border-red-200 hover:bg-red-100"
                  icon={<DeleteOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Popconfirm 会处理确认逻辑
                  }}
                  title="删除整个循环"
                />
              </Popconfirm>
            </Space>
          </div>
        }
      >
        {/* 🌟 渐变背景装饰 - 使用模块化CSS */}
        <div className="loop-top-accent"></div>
        <div className="loop-left-accent"></div>

        <div className="space-y-4 pt-2">
          {isEditing ? (
            // ✏️ 编辑模式 - 蓝色主题表单
            <div className="space-y-4 p-4 bg-white bg-opacity-70 rounded-lg border-2 border-blue-200 shadow-inner" {...noDragProps}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Text className="text-sm font-semibold text-blue-800 block mb-2">
                    🏷️ 循环名称
                  </Text>
                  <Input
                    size="middle"
                    value={tempConfig.name}
                    onChange={(e) =>
                      setTempConfig({ ...tempConfig, name: e.target.value })
                    }
                    placeholder="输入循环名称"
                    className="border-blue-300 focus:border-blue-500"
                  />
                </div>

                <div>
                  <Text className="text-sm font-semibold text-blue-800 block mb-2">
                    🔢 循环次数
                  </Text>
                  <InputNumber
                    size="middle"
                    min={1}
                    max={1000}
                    value={tempConfig.iterations}
                    onChange={(value) =>
                      setTempConfig({ ...tempConfig, iterations: value || 3 })
                    }
                    className="w-full border-blue-300 focus:border-blue-500"
                    placeholder="循环次数"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                <Button
                  size="middle"
                  type="primary"
                  className="bg-blue-500 hover:bg-blue-600 border-blue-500 px-6"
                  onClick={handleSaveConfig}
                >
                  ✅ 保存配置
                </Button>
                <Button
                  size="middle"
                  className="border-gray-300 hover:border-gray-400 px-6"
                  onClick={handleCancelEdit}
                >
                  ❌ 取消
                </Button>
              </div>
            </div>
          ) : (
            // 📊 显示模式 - 循环信息展示
            <div className="text-sm bg-white bg-opacity-50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600 font-medium">
                      🔢 循环次数:
                    </span>
                    <Text
                      strong
                      className="text-blue-700 text-lg bg-blue-100 px-2 py-1 rounded"
                    >
                      {tempConfig.iterations}
                    </Text>
                  </div>
                </div>
                <div className="text-xs text-indigo-600 bg-blue-50 px-2 py-1 rounded">
                  📊 步骤 #{index + 1}
                </div>
              </div>

              <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border-l-4 border-blue-400">
                <div className="flex items-center justify-between">
                  <span>
                    🆔 循环ID:{" "}
                    <code className="text-blue-600 bg-blue-50 px-1 rounded text-xs">
                      {tempConfig.loopId}
                    </code>
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      step.enabled
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {step.enabled ? "✅ 启用" : "❌ 禁用"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default LoopStartCard;
