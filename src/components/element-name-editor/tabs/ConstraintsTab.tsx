import React from 'react';
import { Card, Space, Tag, Button, Alert, Row, Col, Typography, Tooltip, Switch } from 'antd';
import { SettingOutlined, ReloadOutlined } from '@ant-design/icons';
import { CONSTRAINT_CONFIG } from '../logic/constraints';
import { UIElement, MatchingConstraints } from '../../../modules/ElementNameMapper';
import { colors, textStyles, tagStyles } from './uiTokens';

const { Text } = Typography;

interface ConstraintsTabProps {
  element: UIElement | null;
  constraints: MatchingConstraints;
  onReset: () => void;
  onConstraintChange: (key: keyof MatchingConstraints, value: boolean) => void;
}

const ConstraintsTab: React.FC<ConstraintsTabProps> = ({ element, constraints, onReset, onConstraintChange }) => {
  if (!element) return <Alert message="未选择元素" type="info" showIcon />;

  const enabledCount = Object.values(constraints).filter(Boolean).length;
  const totalWeight = CONSTRAINT_CONFIG
    .filter(config => constraints[config.key])
    .reduce((sum, config) => sum + config.weight, 0);

  return (
    <Card
      size="small"
      title={
        <Space>
          <SettingOutlined />
          匹配约束配置
          <Tag color="blue">{enabledCount}/{CONSTRAINT_CONFIG.length}项启用</Tag>
          <Tag color="green">总权重: {totalWeight}%</Tag>
        </Space>
      }
      extra={
        <Button size="small" icon={<ReloadOutlined />} onClick={onReset}>
          重置
        </Button>
      }
      style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
      headStyle={{ background: colors.surfaceAlt, borderBottom: `1px solid ${colors.border}`, color: '#fff' }}
      bodyStyle={{ background: colors.surface }}
    >
      <Alert
        message="匹配约束配置"
        description="选择哪些元素属性用于匹配识别。启用的约束越多，匹配精度越高，但可能影响灵活性。"
        type="info"
        showIcon
        className="mb-4"
        style={{ background: colors.accentInfoBg, border: `1px solid ${colors.accentBlue}` }}
      />

      <div className="space-y-3">
        {CONSTRAINT_CONFIG.map((config) => {
          const configKey = String(config.key) as keyof MatchingConstraints;
          const fieldName = String(config.key).replace('enable', '').replace('Match', '').toLowerCase();
          const currentValue = (element as any)?.[fieldName];
          const hasValue = currentValue !== undefined && currentValue !== null && currentValue !== '';

          return (
            <Row
              key={configKey}
              align="middle"
              className="py-2"
              style={{ borderBottom: '1px solid #303030' }}
            >
              <Col span={16}>
                <Space>
                  <span>{config.icon}</span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <Text strong style={{ color: '#fff' }}>{config.label}</Text>
                      <Tag color="blue" style={tagStyles.small}>{config.englishLabel}</Tag>
                      <Tag color="default" className="ml-2" style={tagStyles.small}>权重{config.weight}%</Tag>
                      {(config as any).recommended && <Tag color="gold" style={tagStyles.small}>推荐</Tag>}
                    </div>
                    <Text type="secondary" style={{ fontSize: 12, color: textStyles.subtle.color }}>{config.description}</Text>
                    {hasValue && (
                      <div className="mt-1">
                        <Text type="success" style={{ fontSize: 11, color: colors.accentGreen }}>
                          当前值: {String(currentValue).substring(0, 30)}
                          {String(currentValue).length > 30 ? '...' : ''}
                        </Text>
                      </div>
                    )}
                    {config.key === 'enableParentMatch' && (element as any)?.parent && (
                      <div className="mt-1">
                        <Text type="success" style={{ fontSize: 11, color: colors.accentGreen }}>
                          父元素: {(element as any).parent.element_type}
                          {(element as any).parent.resource_id && ` (${(element as any).parent.resource_id})`}
                        </Text>
                      </div>
                    )}
                    {config.key === 'enableSiblingMatch' && (element as any)?.siblings && (element as any).siblings.length > 0 && (
                      <div className="mt-1">
                        <Text type="success" style={{ fontSize: 11, color: colors.accentGreen }}>
                          兄弟元素: {(element as any).siblings.length} 个
                        </Text>
                      </div>
                    )}
                  </div>
                </Space>
              </Col>
              <Col span={8} className="text-right">
                <Space>
                  {!hasValue && config.key !== 'enableParentMatch' && config.key !== 'enableSiblingMatch' && (
                    <Tooltip title="当前元素没有此属性值">
                      <Tag color="orange">无值</Tag>
                    </Tooltip>
                  )}
                  <Switch
                    checked={constraints[configKey] as boolean}
                    onChange={(checked) => onConstraintChange(configKey, checked)}
                    size="small"
                  />
                </Space>
              </Col>
            </Row>
          );
        })}
      </div>
    </Card>
  );
};

export default ConstraintsTab;
