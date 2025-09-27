import React from 'react';
import { Button, Card, Select, Space, Typography } from 'antd';
import { ImportStrategyFactory } from '../../strategies/ImportStrategies';
import { ImportStrategyType } from '../../types';
import styles from './StepConfigure.module.css';

const { Option } = Select;
const { Text } = Typography;

interface StepConfigureProps {
  selectedStrategy: ImportStrategyType;
  contactsCount: number;
  selectedDevicesCount: number;
  onChangeStrategy: (strategy: ImportStrategyType) => void;
  onStartImport: () => void;
  disabled?: boolean;
}

export const StepConfigure: React.FC<StepConfigureProps> = ({ selectedStrategy, contactsCount, selectedDevicesCount, onChangeStrategy, onStartImport, disabled }) => {
  return (
    <Card title="配置导入策略">
      <Space direction="vertical" className={styles.wrap}>
        <div className={styles.strategyRow}>
          <Text strong>选择导入策略:</Text>
          <Select className={styles.strategySelect} value={selectedStrategy} onChange={(v) => onChangeStrategy(v)}>
            {ImportStrategyFactory.getAvailableStrategies().map((strategy) => (
              <Option key={strategy.type} value={strategy.type as ImportStrategyType}>
                {strategy.name}
              </Option>
            ))}
          </Select>
        </div>

        <div>
          <Text strong>导入摘要:</Text>
          <ul>
            <li>联系人总数: {contactsCount}</li>
            <li>目标设备: {selectedDevicesCount} 台</li>
            <li>导入策略: {ImportStrategyFactory.create(selectedStrategy).getName()}</li>
          </ul>
        </div>

        <Button type="primary" size="large" onClick={onStartImport} disabled={disabled}>
          开始导入
        </Button>
      </Space>
    </Card>
  );
};
