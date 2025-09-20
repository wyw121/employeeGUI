// 循环步骤卡片组件

import React, { useState } from 'react';
import { Card, Space, Tag, Button, Tooltip, Collapse, Typography, InputNumber, Select, Popconfirm } from 'antd';
import { 
  RedoOutlined, 
  PlayCircleOutlined, 
  PauseCircleOutlined,
  SettingOutlined,
  DeleteOutlined,
  CaretRightOutlined,
  CaretDownOutlined
} from '@ant-design/icons';
import { 
  ExtendedSmartScriptStep, 
  LoopConfig, 
  LoopType, 
  LoopConditionType,
  ExtendedStepActionType 
} from '../types';

const { Text } = Typography;
const { Panel } = Collapse;

export interface LoopStepCardProps {
  /** 循环开始步骤 */
  startStep: ExtendedSmartScriptStep;
  /** 循环结束步骤 */
  endStep: ExtendedSmartScriptStep;
  /** 循环内的步骤 */
  innerSteps: ExtendedSmartScriptStep[];
  /** 是否折叠 */
  collapsed?: boolean;
  /** 是否正在执行 */
  executing?: boolean;
  /** 当前循环次数 */
  currentIteration?: number;
  /** 是否可编辑 */
  editable?: boolean;
  /** 循环配置变更回调 */
  onConfigChange?: (config: LoopConfig) => void;
  /** 删除循环回调 */
  onDelete?: () => void;
  /** 切换折叠状态回调 */
  onToggleCollapse?: () => void;
  /** 渲染内部步骤的函数 */
  renderInnerSteps?: (steps: ExtendedSmartScriptStep[]) => React.ReactNode;
}

export const LoopStepCard: React.FC<LoopStepCardProps> = ({
  startStep,
  endStep,
  innerSteps,
  collapsed = false,
  executing = false,
  currentIteration = 0,
  editable = true,
  onConfigChange,
  onDelete,
  onToggleCollapse,
  renderInnerSteps
}) => {
  const [editMode, setEditMode] = useState(false);
  const [localConfig, setLocalConfig] = useState<LoopConfig>(
    startStep.parameters?.config || {
      type: LoopType.FOR,
      count: 1,
      maxIterations: 100,
      intervalMs: 0,
      continueOnError: false
    }
  );

  // 获取循环类型显示文本
  const getLoopTypeText = (type: LoopType) => {
    switch (type) {
      case LoopType.FOR:
        return '固定次数';
      case LoopType.WHILE:
        return '条件循环';
      case LoopType.INFINITE:
        return '无限循环';
      default:
        return type;
    }
  };

  // 获取循环状态标签
  const getStatusTag = () => {
    if (executing) {
      return (
        <Tag icon={<PlayCircleOutlined />} color="processing">
          执行中 ({currentIteration})
        </Tag>
      );
    }
    return (
      <Tag icon={<PauseCircleOutlined />} color="default">
        待执行
      </Tag>
    );
  };

  // 保存配置
  const handleSaveConfig = () => {
    onConfigChange?.(localConfig);
    setEditMode(false);
  };

  // 渲染循环配置
  const renderLoopConfig = () => {
    if (!editMode) {
      return (
        <Space direction="vertical" size="small">
          <Text type="secondary">
            类型: {getLoopTypeText(localConfig.type)}
          </Text>
          {localConfig.type === LoopType.FOR && (
            <Text type="secondary">
              次数: {localConfig.count}
            </Text>
          )}
          {localConfig.intervalMs > 0 && (
            <Text type="secondary">
              间隔: {localConfig.intervalMs}ms
            </Text>
          )}
          <Text type="secondary">
            包含步骤: {innerSteps.length} 个
          </Text>
        </Space>
      );
    }

    return (
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <label>循环类型:</label>
          <Select
            value={localConfig.type}
            onChange={(value) => setLocalConfig({ ...localConfig, type: value })}
            style={{ width: 120, marginLeft: 8 }}
          >
            <Select.Option value={LoopType.FOR}>固定次数</Select.Option>
            <Select.Option value={LoopType.WHILE}>条件循环</Select.Option>
            <Select.Option value={LoopType.INFINITE}>无限循环</Select.Option>
          </Select>
        </div>
        
        {localConfig.type === LoopType.FOR && (
          <div>
            <label>循环次数:</label>
            <InputNumber
              min={1}
              max={1000}
              value={localConfig.count}
              onChange={(value) => setLocalConfig({ ...localConfig, count: value || 1 })}
              style={{ marginLeft: 8 }}
            />
          </div>
        )}
        
        <div>
          <label>循环间隔(ms):</label>
          <InputNumber
            min={0}
            max={10000}
            value={localConfig.intervalMs}
            onChange={(value) => setLocalConfig({ ...localConfig, intervalMs: value || 0 })}
            style={{ marginLeft: 8 }}
          />
        </div>
        
        <Space>
          <Button size="small" type="primary" onClick={handleSaveConfig}>
            保存
          </Button>
          <Button size="small" onClick={() => setEditMode(false)}>
            取消
          </Button>
        </Space>
      </Space>
    );
  };

  return (
    <Card
      size="small"
      className={`loop-step-card ${executing ? 'executing' : ''} ${collapsed ? 'collapsed' : ''}`}
      title={
        <Space>
          <RedoOutlined style={{ color: '#1890ff' }} />
          <span>{startStep.name || '循环步骤'}</span>
          {getStatusTag()}
        </Space>
      }
      extra={
        <Space>
          <Tooltip title="循环配置">
            <Button
              type="text"
              size="small"
              icon={<SettingOutlined />}
              onClick={() => setEditMode(!editMode)}
            />
          </Tooltip>
          <Tooltip title={collapsed ? '展开' : '折叠'}>
            <Button
              type="text"
              size="small"
              icon={collapsed ? <CaretRightOutlined /> : <CaretDownOutlined />}
              onClick={onToggleCollapse}
            />
          </Tooltip>
          {editable && (
            <Tooltip title="删除循环">
              <Popconfirm
                title="确认删除循环"
                description="删除循环将同时删除循环内的所有步骤，此操作不可撤销"
                onConfirm={onDelete}
                okText="删除"
                cancelText="取消"
                okType="danger"
                placement="topLeft"
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      }
      style={{
        marginBottom: 16,
        border: executing ? '2px solid #1890ff' : '1px solid #d9d9d9',
        boxShadow: executing ? '0 2px 8px rgba(24, 144, 255, 0.2)' : undefined
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* 循环配置区域 */}
        <div className="loop-config-area">
          {renderLoopConfig()}
        </div>

        {/* 循环体步骤区域 */}
        {!collapsed && (
          <div className="loop-body-area">
            <div 
              className="loop-body-container"
              style={{
                border: '2px dashed #1890ff',
                borderRadius: 8,
                padding: 16,
                backgroundColor: '#f6ffed',
                minHeight: innerSteps.length === 0 ? 100 : 'auto'
              }}
            >
              <div className="loop-body-header">
                <Text type="secondary">
                  🔄 循环体 ({innerSteps.length} 个步骤)
                </Text>
              </div>
              
              <div className="loop-body-content">
                {innerSteps.length === 0 ? (
                  <div 
                    className="empty-loop-body"
                    style={{
                      textAlign: 'center',
                      padding: '24px 0',
                      color: '#999'
                    }}
                  >
                    拖拽步骤到此处添加到循环中
                  </div>
                ) : (
                  renderInnerSteps?.(innerSteps) || (
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {innerSteps.map((step, index) => (
                        <div key={step.id} className="loop-inner-step">
                          <Text>
                            {index + 1}. {step.name} ({step.step_type})
                          </Text>
                        </div>
                      ))}
                    </Space>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </Space>
    </Card>
  );
};

export default LoopStepCard;