// 循环结束卡片组件

import React from 'react';
import { Card, Button, Space, Typography, Tag } from 'antd';
import { 
  CheckCircleOutlined, 
  DeleteOutlined,
  DragOutlined
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
}

export const LoopEndCard: React.FC<LoopEndCardProps> = ({
  step,
  index,
  loopConfig,
  isDragging,
  onDeleteLoop,
  onToggle
}) => {
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
              {/* 🗑️ 删除循环按钮 */}
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
    </div>
  );
};

export default LoopEndCard;