import React from 'react';
import {
  Card,
  Space,
  Typography,
  Tag,
  Progress,
  Empty,
  Timeline,
  Statistic,
  Row,
  Col,
  Alert
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  BugOutlined,
  RocketOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useSingleStepTest } from '../hooks/useSingleStepTest';
import type { SingleStepTestResult } from '../types/smartScript';

const { Title, Text, Paragraph } = Typography;

interface TestResultsDisplayProps {
  className?: string;
}

export const TestResultsDisplay: React.FC<TestResultsDisplayProps> = ({
  className = ''
}) => {
  const { getAllTestResults, clearAllResults } = useSingleStepTest();
  const testResults = getAllTestResults();
  
  if (testResults.length === 0) {
    return (
      <Card className={className}>
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无测试结果"
        />
      </Card>
    );
  }

  // 计算统计数据
  const successCount = testResults.filter(r => r.success).length;
  const failureCount = testResults.length - successCount;
  const successRate = (successCount / testResults.length * 100).toFixed(1);
  const avgDuration = Math.round(
    testResults.reduce((sum, r) => sum + r.duration_ms, 0) / testResults.length
  );

  // 渲染单个测试结果
  const renderTestResult = (result: SingleStepTestResult, index: number) => {
    const dot = result.success ? (
      <CheckCircleOutlined className="text-green-500" />
    ) : (
      <CloseCircleOutlined className="text-red-500" />
    );

    return (
      <Timeline.Item dot={dot} key={`${result.step_id}-${index}`}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Space>
              <Text strong>{result.step_name}</Text>
              <Tag color={result.success ? 'success' : 'error'}>
                {result.success ? '成功' : '失败'}
              </Tag>
              <Tag>{result.duration_ms}ms</Tag>
            </Space>
            <Text type="secondary" className="text-xs">
              {new Date(result.timestamp).toLocaleTimeString()}
            </Text>
          </div>

          <Paragraph className="text-sm text-gray-600 mb-1">
            {result.message}
          </Paragraph>

          {result.page_state && (
            <div>
              <Text type="secondary" className="text-xs">页面状态: </Text>
              <Tag color="blue">{result.page_state}</Tag>
            </div>
          )}

          {result.ui_elements && result.ui_elements.length > 0 && (
            <div>
              <Text type="secondary" className="text-xs">
                发现 {result.ui_elements.length} 个UI元素
              </Text>
            </div>
          )}

          {result.logs && result.logs.length > 0 && (
            <div className="bg-gray-50 p-2 rounded text-xs max-h-20 overflow-y-auto">
              {result.logs.map((log, logIndex) => (
                <div key={logIndex} className="text-gray-600">
                  {log}
                </div>
              ))}
            </div>
          )}

          {!result.success && result.error_details && (
            <Alert
              message={result.error_details}
              type="error"
              showIcon
              className="text-xs"
            />
          )}

          {result.extracted_data && Object.keys(result.extracted_data).length > 0 && (
            <div className="bg-blue-50 p-2 rounded">
              <Text type="secondary" className="text-xs">提取的数据:</Text>
              <pre className="text-xs mt-1">
                {JSON.stringify(result.extracted_data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </Timeline.Item>
    );
  };

  return (
    <Card 
      title={
        <Space>
          <BugOutlined />
          <span>测试结果</span>
          <Tag color="blue">{testResults.length}</Tag>
        </Space>
      }
      className={className}
      extra={
        <Space>
          <Text 
            type="secondary" 
            className="cursor-pointer hover:text-blue-500"
            onClick={clearAllResults}
          >
            清除全部
          </Text>
        </Space>
      }
    >
      {/* 统计概览 */}
      <Row gutter={16} className="mb-4">
        <Col span={6}>
          <Statistic
            title="成功率"
            value={successRate}
            suffix="%"
            valueStyle={{ 
              color: successCount > failureCount ? '#3f8600' : '#cf1322' 
            }}
            prefix={<RocketOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="成功"
            value={successCount}
            valueStyle={{ color: '#3f8600' }}
            prefix={<CheckCircleOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="失败"
            value={failureCount}
            valueStyle={{ color: '#cf1322' }}
            prefix={<CloseCircleOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="平均耗时"
            value={avgDuration}
            suffix="ms"
            prefix={<ClockCircleOutlined />}
          />
        </Col>
      </Row>

      {/* 成功率进度条 */}
      <div className="mb-4">
        <Progress
          percent={parseFloat(successRate)}
          status={successCount === testResults.length ? 'success' : 'active'}
          strokeColor={{
            '0%': '#108ee9',
            '100%': '#87d068',
          }}
          showInfo={false}
        />
      </div>

      {/* 测试结果时间线 */}
      <div className="max-h-96 overflow-y-auto">
        <Timeline mode="left">
          {testResults
            .sort((a, b) => b.timestamp - a.timestamp) // 按时间倒序
            .map((result, index) => renderTestResult(result, index))}
        </Timeline>
      </div>

      {/* 快速操作提示 */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <Space direction="vertical" size={4}>
          <Text className="text-xs text-blue-600">
            <EyeOutlined /> 提示: 点击步骤测试按钮查看详细结果
          </Text>
          <Text className="text-xs text-gray-500">
            • 绿色图标表示测试成功，红色图标表示测试失败
          </Text>
          <Text className="text-xs text-gray-500">
            • 测试结果按时间倒序显示，最新的在上方
          </Text>
        </Space>
      </div>
    </Card>
  );
};

export default TestResultsDisplay;