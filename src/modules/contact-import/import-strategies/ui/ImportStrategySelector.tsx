import React, { useState, useMemo } from 'react';
import { Radio, Card, Badge, Tooltip, Collapse, Alert, Space, Tag } from 'antd';
import { InfoCircleOutlined, CheckCircleOutlined, WarningOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { ImportStrategy, DeviceManufacturer, VCardVersion, ImportTriggerMethod } from '../types';
import { IMPORT_STRATEGIES, getRecommendedStrategies } from '../strategies';

interface ImportStrategySelectorProps {
  deviceInfo?: {
    manufacturer?: string;
    model?: string;
    androidVersion?: string;
  };
  selectedStrategy?: ImportStrategy;
  onStrategyChange: (strategy: ImportStrategy) => void;
  showAllStrategies?: boolean;
}

const { Panel } = Collapse;

export const ImportStrategySelector: React.FC<ImportStrategySelectorProps> = ({
  deviceInfo,
  selectedStrategy,
  onStrategyChange,
  showAllStrategies = false
}) => {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['recommended']);

  const { recommendedStrategies, allStrategies } = useMemo(() => {
    const recommended = deviceInfo ? getRecommendedStrategies(deviceInfo) : [];
    const all = IMPORT_STRATEGIES;
    
    return {
      recommendedStrategies: recommended,
      allStrategies: all
    };
  }, [deviceInfo]);

  const getSuccessRateBadge = (successRate: ImportStrategy['successRate']) => {
    const config = {
      high: { status: 'success' as const, icon: <CheckCircleOutlined />, text: '成功率高' },
      medium: { status: 'processing' as const, icon: <InfoCircleOutlined />, text: '成功率中等' },
      low: { status: 'warning' as const, icon: <WarningOutlined />, text: '成功率低' },
      failed: { status: 'error' as const, icon: <CloseCircleOutlined />, text: '已知失败' }
    };
    
    return (
      <Badge 
        status={config[successRate].status} 
        text={
          <Space size={4}>
            {config[successRate].icon}
            {config[successRate].text}
          </Space>
        }
      />
    );
  };

  const getVersionTag = (version: VCardVersion) => {
    const colors = {
      '2.1': 'blue',
      '3.0': 'green', 
      '4.0': 'orange'
    };
    return <Tag color={colors[version]}>vCard {version}</Tag>;
  };

  const getMethodTag = (method: ImportTriggerMethod) => {
    const config = {
      VIEW_X_VCARD: { color: 'cyan', text: 'VIEW方式A' },
      VIEW_VCARD: { color: 'geekblue', text: 'VIEW方式B' },
      DIRECT_ACTIVITY: { color: 'purple', text: '直接导入' }
    };
    
    return <Tag color={config[method].color}>{config[method].text}</Tag>;
  };

  const renderStrategyCard = (strategy: ImportStrategy, isRecommended = false) => (
    <Card
      key={strategy.id}
      size="small"
      style={{ marginBottom: 8 }}
      className={selectedStrategy?.id === strategy.id ? 'ant-card-selected' : ''}
    >
      <Radio 
        value={strategy.id}
        style={{ width: '100%' }}
      >
        <div style={{ marginLeft: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Space>
              <strong>{strategy.name}</strong>
              {isRecommended && <Badge status="processing" text="推荐" />}
            </Space>
            {getSuccessRateBadge(strategy.successRate)}
          </div>
          
          <div style={{ marginBottom: 8, color: '#666' }}>
            {strategy.description}
          </div>
          
          <Space size={4} wrap>
            {getVersionTag(strategy.vCardVersion)}
            {getMethodTag(strategy.triggerMethod)}
            <Tag color="default">{strategy.manufacturer}</Tag>
          </Space>
          
          {strategy.testedDevices.length > 0 && (
            <div style={{ marginTop: 4, fontSize: '12px', color: '#999' }}>
              已测试设备: {strategy.testedDevices.join(', ')}
            </div>
          )}
          
          {strategy.notes && (
            <Tooltip title={strategy.notes}>
              <div style={{ marginTop: 4, fontSize: '12px', color: '#1890ff', cursor: 'help' }}>
                <InfoCircleOutlined /> 查看说明
              </div>
            </Tooltip>
          )}
        </div>
      </Radio>
    </Card>
  );

  return (
    <div className="import-strategy-selector">
      <Radio.Group
        value={selectedStrategy?.id}
        onChange={(e) => {
          const strategy = allStrategies.find(s => s.id === e.target.value);
          if (strategy) onStrategyChange(strategy);
        }}
        style={{ width: '100%' }}
      >
        <Collapse 
          activeKey={expandedCategories}
          onChange={setExpandedCategories}
          ghost
        >
          {/* 推荐策略 */}
          {recommendedStrategies.length > 0 && (
            <Panel
              header={
                <Space>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  推荐策略 ({recommendedStrategies.length})
                  {deviceInfo?.manufacturer && (
                    <Tag>{deviceInfo.manufacturer}</Tag>
                  )}
                </Space>
              }
              key="recommended"
            >
              <Alert
                message="基于您的设备信息推荐以下导入策略"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              
              {recommendedStrategies.map(strategy => 
                renderStrategyCard(strategy, true)
              )}
            </Panel>
          )}

          {/* 所有策略 */}
          {showAllStrategies && (
            <Panel
              header={
                <Space>
                  <InfoCircleOutlined />
                  所有可用策略 ({allStrategies.length})
                </Space>
              }
              key="all"
            >
              <Alert
                message="包含所有预设策略，包括实验性和已知失败的方式"
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
              
              {allStrategies.map(strategy => 
                renderStrategyCard(strategy)
              )}
            </Panel>
          )}
        </Collapse>
      </Radio.Group>

      {/* 策略详情 */}
      {selectedStrategy && (
        <Card 
          title="选中策略详情" 
          size="small" 
          style={{ marginTop: 16 }}
          headStyle={{ background: 'var(--dark-bg-tertiary)', borderBottom: '1px solid var(--dark-border-primary)', color: 'var(--dark-text-primary)' }}
          bodyStyle={{ background: 'var(--dark-bg-card)', color: 'var(--dark-text-primary)' }}
        >
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <div>
              <strong>触发方式:</strong> {selectedStrategy.triggerMethod}
            </div>
            <div>
              <strong>MIME类型:</strong> {selectedStrategy.mimeType}
            </div>
            {selectedStrategy.activityComponent && (
              <div>
                <strong>组件:</strong> 
                <code style={{ fontSize: '11px', marginLeft: 8 }}>
                  {selectedStrategy.activityComponent}
                </code>
              </div>
            )}
            {selectedStrategy.notes && (
              <Alert
                message={selectedStrategy.notes}
                type={selectedStrategy.successRate === 'failed' ? 'error' : 'info'}
                showIcon
              />
            )}
          </Space>
        </Card>
      )}
    </div>
  );
};