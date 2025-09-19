// 循环结束卡片组件

import React, { useState } from 'react';
import { Card, Button, Space, Typography, Tag, Modal, InputNumber, Switch, Divider } from 'antd';
import { 
  CheckCircleOutlined, 
  DeleteOutlined,
  DragOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { LoopConfig, ExtendedSmartScriptStep } from '../types/loopScript';

const { Text } = Typography;

export interface LoopEndCardProps {
  /** 循环步骤数据 */
  step: ExtendedSmartScriptStep;
  /** 步骤索引 */
  index: number;
  /** 对应的循环配置 */
  loopConfig?: LoopConfig;
  /** 是否正在拖拽 */
  isDragging?: boolean;
  /** 删除循环回调 */
  onDeleteLoop: (loopId: string) => void;
  /** 切换启用状态回调 */
  onToggle: (stepId: string) => void;
  /** 更新步骤参数回调 */
  onUpdateStepParameters?: (stepId: string, parameters: Record<string, any>) => void;
}

export const LoopEndCard: React.FC<LoopEndCardProps> = ({
  step,
  index,
  loopConfig,
  isDragging,
  onDeleteLoop,
  onToggle,
  onUpdateStepParameters
}) => {
  // 循环配置状态
  const [isLoopConfigVisible, setIsLoopConfigVisible] = useState(false);
  const [loopCount, setLoopCount] = useState<number>(
    (step.parameters?.loop_count as number) || 3
  );
  const [isInfiniteLoop, setIsInfiniteLoop] = useState<boolean>(
    (step.parameters?.is_infinite_loop as boolean) || false
  );

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

  const handleDeleteLoop = () => {
    if (loopConfig) {
      onDeleteLoop(loopConfig.loopId);
    }
  };

  // 处理循环配置保存
  const handleSaveLoopConfig = () => {
    if (onUpdateStepParameters) {
      const parameters = {
        ...step.parameters,
        loop_count: isInfiniteLoop ? -1 : loopCount,
        is_infinite_loop: isInfiniteLoop
      };
      onUpdateStepParameters(step.id, parameters);
    }
    setIsLoopConfigVisible(false);
  };

  // 显示循环配置模态框
  const showLoopConfigModal = () => {
    setIsLoopConfigVisible(true);
  };

  // 取消循环配置
  const handleCancelLoopConfig = () => {
    // 重置为原始值
    setLoopCount((step.parameters?.loop_count as number) || 3);
    setIsInfiniteLoop((step.parameters?.is_infinite_loop as boolean) || false);
    setIsLoopConfigVisible(false);
  };

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
        className="transition-all duration-300 ease-in-out cursor-grab hover:cursor-grabbing relative overflow-hidden"
        style={{ 
          touchAction: 'none',
          border: '4px solid #3b82f6',
          background: 'linear-gradient(to bottom right, #dbeafe, #bfdbfe, #93c5fd)',
          boxShadow: sortableIsDragging ? 
            '0 20px 40px rgba(59, 130, 246, 0.6), 0 0 0 2px rgba(59, 130, 246, 0.5), 0 0 0 4px rgba(59, 130, 246, 0.3)' : 
            '0 8px 25px rgba(59, 130, 246, 0.4), 0 0 0 1px rgba(59, 130, 246, 0.2), 0 0 0 4px rgba(59, 130, 246, 0.3)',
          ...(sortableIsDragging ? {
            transform: 'rotate(2deg) scale(1.05)',
            borderColor: '#1d4ed8'
          } : {})
        }}
        title={
          <div className="flex items-center justify-between bg-blue-50 bg-opacity-80 -m-2 p-3 rounded-t border-b-2 border-blue-200">
            <div className="flex items-center space-x-3">
              {/* 🎯 突出的拖拽手柄 */}
              <div className="p-2 bg-blue-600 bg-opacity-30 rounded-lg hover:bg-opacity-50 transition-all">
                <DragOutlined className="text-blue-700 text-lg font-bold" />
              </div>
              
              {/* 🏁 循环结束图标 */}
              <div className="p-1.5 bg-blue-700 text-white rounded-full shadow-lg">
                <CheckCircleOutlined className="text-sm" />
              </div>
              
              {/* 🏷️ 循环结束标题 */}
              <Text strong className="text-blue-800 text-lg">
                🏁 循环结束
              </Text>
              
              {/* 🏷️ 循环名称标签 */}
              <Tag 
                color="blue" 
                className="bg-blue-100 border-blue-300 text-blue-700 font-medium px-3 py-1"
              >
                {loopConfig?.name || '未命名循环'}
              </Tag>
              
              {/* ❌ 禁用状态标签 */}
              {!step.enabled && (
                <Tag color="default" className="bg-gray-100 border-gray-300">
                  已禁用
                </Tag>
              )}
            </div>
            
            <Space size="small">
              {/* � 循环次数设置按钮 */}
              <Button
                type="text"
                size="small"
                className="hover:bg-blue-100 border-blue-200"
                icon={<ReloadOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  showLoopConfigModal();
                }}
                style={{
                  backgroundColor: isInfiniteLoop ? '#fed7aa' : '#dbeafe',
                  borderColor: isInfiniteLoop ? '#f59e0b' : '#3b82f6',
                  color: isInfiniteLoop ? '#92400e' : '#1e40af'
                }}
                title={`设置循环次数 (当前: ${isInfiniteLoop ? '无限' : `${loopCount}次`})`}
              >
                {isInfiniteLoop ? '∞' : `${loopCount}次`}
              </Button>

              {/* �🗑️ 删除循环按钮 */}
              <Button
                type="text"
                size="small"
                danger
                className="bg-red-50 hover:bg-red-100 border-red-200"
                icon={<DeleteOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteLoop();
                }}
                title="删除整个循环"
              />
            </Space>
          </div>
        }
      >
        {/* 🌟 渐变背景装饰 */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600"></div>
        
        <div className="space-y-3 pt-2">
          <div className="text-sm bg-white bg-opacity-50 p-3 rounded-lg">
            <div className="text-blue-700 font-medium mb-2">
              🔄 循环体结束，返回循环开始处继续执行
            </div>
            
            <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border-l-4 border-blue-400">
              <div className="flex items-center justify-between">
                <span>📊 步骤 #{index + 1}</span>
                <span>🆔 循环ID: <code className="text-blue-600 bg-blue-50 px-1 rounded">{loopConfig?.loopId}</code></span>
                <span className={`px-2 py-1 rounded text-xs ${step.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                  {step.enabled ? '✅ 启用' : '❌ 禁用'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 循环配置模态框 */}
      <Modal
        title="🔄 循环结束配置"
        open={isLoopConfigVisible}
        onOk={handleSaveLoopConfig}
        onCancel={handleCancelLoopConfig}
        okText="确定"
        cancelText="取消"
        width={480}
        className="loop-config-modal"
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
                : '当执行到循环结束卡片时，如果还未达到设定次数，将返回循环开始处继续执行。'
              }
            </Text>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LoopEndCard;