import React, { useState } from 'react';
import { Card, Switch, Space, Divider, Typography, Alert } from 'antd';
import { SettingOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { ImportStrategySelector } from '../../../../../import-strategies/ui/ImportStrategySelector';
import type { ImportStrategy } from '../../../../../import-strategies/types';

interface EnhancedStrategyConfiguratorProps {
  /** 设备信息用于策略推荐 */
  deviceInfo?: {
    manufacturer?: string;
    model?: string;
    androidVersion?: string;
  };
  /** 当前选择的策略 */
  selectedStrategy?: ImportStrategy;
  /** 策略变更回调 */
  onStrategyChange: (strategy: ImportStrategy) => void;
  /** 设备上下文信息，用于用户提示 */
  deviceContext?: {
    deviceName?: string;
  };
}

const { Text, Title } = Typography;

/**
 * 增强的导入策略配置器
 * 
 * 解决用户只能看到推荐策略而无法看到所有策略的问题
 * 提供智能推荐模式和完整选择模式的切换
 * 
 * 特性:
 * - ✅ 智能推荐模式：只显示推荐策略（默认）
 * - ✅ 专家模式：显示所有可用策略
 * - ✅ 一键切换：用户可以轻松在两种模式间切换
 * - ✅ 上下文提示：显示设备信息和策略数量
 * - ✅ 模块化设计：文件大小控制在100行以内
 */
export const EnhancedStrategyConfigurator: React.FC<EnhancedStrategyConfiguratorProps> = ({
  deviceInfo,
  selectedStrategy,
  onStrategyChange,
  deviceContext
}) => {
  const [showAllStrategies, setShowAllStrategies] = useState(false);

  return (
    <div className="enhanced-strategy-configurator">
      {/* 模式切换控制 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <ThunderboltOutlined />
              <Text strong>策略选择模式</Text>
            </Space>
            <Switch
              checked={showAllStrategies}
              onChange={setShowAllStrategies}
              checkedChildren={
                <Space size={4}>
                  <SettingOutlined />
                  专家模式
                </Space>
              }
              unCheckedChildren="智能推荐"
              size="default"
            />
          </div>

          {deviceContext?.deviceName && (
            <Alert
              message={`目标设备: ${deviceContext.deviceName}`}
              description={
                showAllStrategies 
                  ? "专家模式：显示所有可用的导入策略，包括实验性选项"
                  : "智能推荐：基于设备信息推荐最适合的导入策略"
              }
              type={showAllStrategies ? "warning" : "info"}
              showIcon
              style={{ margin: 0 }}
            />
          )}

          {!showAllStrategies && deviceInfo?.manufacturer && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              <Text type="secondary">
                基于 {deviceInfo.manufacturer} 设备的策略推荐
                {deviceInfo.model && ` (${deviceInfo.model})`}
              </Text>
            </div>
          )}
        </Space>
      </Card>

      {/* 策略选择器 */}
      <ImportStrategySelector
        deviceInfo={deviceInfo}
        selectedStrategy={selectedStrategy}
        onStrategyChange={onStrategyChange}
        showAllStrategies={showAllStrategies}
      />

      {/* 模式说明 */}
      <Card size="small" style={{ marginTop: 16 }} styles={{ body: { padding: 12 } }}>
        <Space direction="vertical" size={4}>
          <Text strong style={{ fontSize: '12px' }}>
            {showAllStrategies ? '🔧 专家模式' : '🎯 智能推荐模式'}
          </Text>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {showAllStrategies 
              ? '显示所有预设策略，包括不同vCard版本和触发方式组合。适合有经验的用户或需要尝试特定策略的场景。'
              : '基于设备制造商和型号自动推荐最可能成功的策略，适合大多数用户快速选择。'
            }
          </Text>
          {!showAllStrategies && (
            <Text style={{ fontSize: '11px', color: '#1890ff' }}>
              💡 如果推荐策略无效，请切换到专家模式尝试其他策略
            </Text>
          )}
        </Space>
      </Card>
    </div>
  );
};