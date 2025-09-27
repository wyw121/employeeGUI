import React from 'react';
import { Badge, List, Space, Tag, Typography } from 'antd';
import type { SingleStepTestResult } from '../../types/smartScript';

const { Text } = Typography;

export interface MultiDeviceTestSummary {
  total: number;
  successCount: number;
  failureCount: number;
  durationMs: number;
}

export interface MultiDeviceResultPanelProps {
  results: Record<string, SingleStepTestResult>;
  summary: MultiDeviceTestSummary;
  deviceNameMap?: Record<string, string>;
}

export const MultiDeviceResultPanel: React.FC<MultiDeviceResultPanelProps> = ({ results, summary, deviceNameMap }) => {
  const entries = Object.entries(results);
  return (
    <div className="light-surface">
      <div className="mb-3">
        <Space size={8} wrap>
          <Tag color="blue">设备数: {summary.total}</Tag>
          <Tag color="success">成功: {summary.successCount}</Tag>
          <Tag color="error">失败: {summary.failureCount}</Tag>
          <Tag>耗时: {summary.durationMs}ms</Tag>
        </Space>
      </div>
      <List
        size="small"
        dataSource={entries}
        renderItem={([deviceId, res]) => (
          <List.Item>
            <Space className="w-full" align="start">
              <Badge status={res.success ? 'success' : 'error'} />
              <div className="flex-1">
                <div className="font-medium">
                  {deviceNameMap?.[deviceId] || deviceId}
                  <Text type="secondary" style={{ marginLeft: 8 }}>({deviceId})</Text>
                </div>
                <div className="text-xs text-gray-500">
                  {res.message || (res.success ? '执行成功' : '执行失败')}
                </div>
              </div>
              {typeof (res as any).durationMs === 'number' && (
                <Tag>{(res as any).durationMs}ms</Tag>
              )}
            </Space>
          </List.Item>
        )}
      />
    </div>
  );
};

export default MultiDeviceResultPanel;
