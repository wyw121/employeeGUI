// 循环开始卡片组件 - 独特的蓝色主题

import React, { useState } from 'react';
import { Card, Button, Input, Typography, Tag, Tooltip, Space, InputNumber, Popconfirm, message } from 'antd';
import { 
  ReloadOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SettingOutlined,
  DragOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { LoopConfig, ExtendedSmartScriptStep } from '../types/loopScript';

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
  onToggle
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempConfig, setTempConfig] = useState<LoopConfig>(
    loopConfig || {
      loopId: step.parameters?.loop_id || `loop_${Date.now()}`,
      name: step.parameters?.loop_name || '新循环',
      iterations: step.parameters?.loop_count || 3,
      enabled: step.enabled,
      description: step.description
    }
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
    opacity: isDragging || sortableIsDragging ? 0.8 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

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
      message.success(`已删除循环: ${tempConfig.name || '未命名循环'}`);
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
      {/* 🎨 独特的蓝色循环卡片设计 */}
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
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(219, 234, 254, 0.8)',
            margin: '-8px',
            padding: '12px',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            borderBottom: '2px solid #bfdbfe'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* 🎯 突出的拖拽手柄 */}
              <div style={{
                padding: '8px',
                backgroundColor: 'rgba(37, 99, 235, 0.3)',
                borderRadius: '8px',
                cursor: 'grab'
              }}>
                <DragOutlined style={{ color: '#1d4ed8', fontSize: '18px', fontWeight: 'bold' }} />
              </div>
              
              {/* 🔄 循环图标 */}
              <div style={{
                padding: '6px',
                backgroundColor: '#1d4ed8',
                color: 'white',
                borderRadius: '50%',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}>
                <ReloadOutlined style={{ fontSize: '14px' }} />
              </div>
              
              {/* 🏷️ 循环标题 */}
              <Text strong style={{ color: '#1e3a8a', fontSize: '18px', fontWeight: 'bold' }}>
                🔄 循环开始
              </Text>
              
              {/* 🏷️ 循环名称标签 */}
              <Tag 
                color="blue" 
                style={{
                  backgroundColor: '#bfdbfe',
                  borderColor: '#60a5fa',
                  color: '#1e40af',
                  fontWeight: 'bold',
                  padding: '4px 12px'
                }}
              >
                {tempConfig.name}
              </Tag>
              
              {/* ❌ 禁用状态标签 */}
              {!step.enabled && (
                <Tag color="default" className="bg-gray-100 border-gray-300">
                  已禁用
                </Tag>
              )}
            </div>
            
            <Space size="small">
              {/* ⚙️ 设置按钮 */}
              <Button
                type="text"
                size="small"
                style={{
                  backgroundColor: 'rgba(239, 246, 255, 1)',
                  borderColor: '#bfdbfe',
                  color: '#2563eb'
                }}
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
                  style={{
                    backgroundColor: 'rgba(254, 242, 242, 1)',
                    borderColor: '#fecaca'
                  }}
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
        {/* 🌟 渐变背景装饰 */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600"></div>
        
        <div className="space-y-4 pt-2">
          {isEditing ? (
            // ✏️ 编辑模式 - 蓝色主题表单
            <div className="space-y-4 p-4 bg-white bg-opacity-70 rounded-lg border-2 border-blue-200 shadow-inner">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <Text style={{ fontSize: '14px', fontWeight: 600, color: '#1d4ed8', display: 'block', marginBottom: '8px' }}>
                    🏷️ 循环名称
                  </Text>
                  <Input
                    size="middle"
                    value={tempConfig.name}
                    onChange={(e) => setTempConfig({...tempConfig, name: e.target.value})}
                    placeholder="输入循环名称"
                    style={{ borderColor: '#93c5fd' }}
                  />
                </div>
                
                <div>
                  <Text style={{ fontSize: '14px', fontWeight: 600, color: '#1d4ed8', display: 'block', marginBottom: '8px' }}>
                    🔢 循环次数
                  </Text>
                  <InputNumber
                    size="middle"
                    min={1}
                    max={1000}
                    value={tempConfig.iterations}
                    onChange={(value) => setTempConfig({...tempConfig, iterations: value || 3})}
                    style={{ width: '100%', borderColor: '#93c5fd' }}
                    placeholder="循环次数"
                  />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <Button 
                  size="middle" 
                  type="primary" 
                  style={{
                    backgroundColor: '#3b82f6',
                    borderColor: '#3b82f6',
                    padding: '0 24px'
                  }}
                  onClick={handleSaveConfig}
                >
                  ✅ 保存配置
                </Button>
                <Button 
                  size="middle" 
                  style={{
                    borderColor: '#d1d5db',
                    padding: '0 24px'
                  }}
                  onClick={handleCancelEdit}
                >
                  ❌ 取消
                </Button>
              </div>
            </div>
          ) : (
            // 📊 显示模式 - 循环信息展示
            <div style={{
              fontSize: '14px',
              backgroundColor: 'rgba(255, 255, 255, 0.5)',
              padding: '12px',
              borderRadius: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#2563eb', fontWeight: 500 }}>🔢 循环次数:</span>
                    <Text strong style={{
                      color: '#1e40af',
                      fontSize: '18px',
                      backgroundColor: '#dbeafe',
                      padding: '4px 8px',
                      borderRadius: '4px'
                    }}>
                      {tempConfig.iterations}
                    </Text>
                  </div>
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#6366f1',
                  backgroundColor: 'rgba(239, 246, 255, 1)',
                  padding: '4px 8px',
                  borderRadius: '4px'
                }}>
                  📊 步骤 #{index + 1}
                </div>
              </div>
              
              <div style={{
                fontSize: '12px',
                color: '#4b5563',
                backgroundColor: '#f9fafb',
                padding: '8px',
                borderRadius: '4px',
                borderLeft: '4px solid #60a5fa'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>🆔 循环ID: <code style={{
                    color: '#2563eb',
                    backgroundColor: 'rgba(239, 246, 255, 1)',
                    padding: '2px 4px',
                    borderRadius: '2px'
                  }}>{tempConfig.loopId}</code></span>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    backgroundColor: step.enabled ? '#dcfce7' : '#f3f4f6',
                    color: step.enabled ? '#166534' : '#374151'
                  }}>
                    {step.enabled ? '✅ 启用' : '❌ 禁用'}
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