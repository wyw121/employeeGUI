import React from 'react';
import { Typography, Space, Tag, Divider, Alert, Badge, Button } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, BugOutlined } from '@ant-design/icons';
import type { SingleStepTestResult } from '../../types/smartScript';
import { TestResultCopyButton } from './TestResultCopyButton';

const { Text, Paragraph } = Typography;

interface TestResultDetailProps {
  result: SingleStepTestResult;
  stepName: string;
  onClear: () => void;
}

/**
 * 测试结果详情组件，用于在弹窗中展示测试结果
 */
export const TestResultDetail: React.FC<TestResultDetailProps> = ({ 
  result, 
  stepName,
  onClear
}) => {
  return (
    <div style={{ maxWidth: 400 }}>
      {/* 结果标题与状态 */}
      <div className="mb-3">
        <Space align="center">
          {result.success ? (
            <CheckCircleOutlined className="text-green-500" />
          ) : (
            <CloseCircleOutlined className="text-red-500" />
          )}
          <Text strong>
            {result.success ? '测试成功' : '测试失败'}
          </Text>
          <Tag color={result.success ? 'green' : 'red'}>
            {result.duration_ms}ms
          </Tag>
        </Space>
      </div>

      <Divider style={{ margin: '8px 0' }} />

      {/* 详细内容 */}
      <div className="space-y-2">
        {/* 执行消息 */}
        <div>
          <Text type="secondary" className="text-xs">执行消息:</Text>
          <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded text-xs">
            <Text className="whitespace-pre-wrap break-all">{result.message}</Text>
          </div>
        </div>

        {/* 页面状态 */}
        {result.page_state && (
          <div>
            <Text type="secondary" className="text-xs">页面状态:</Text>
            <Tag color="blue">{result.page_state}</Tag>
          </div>
        )}

        {/* 找到元素 */}
        {result.ui_elements && result.ui_elements.length > 0 && (
          <div>
            <Text type="secondary" className="text-xs">找到元素:</Text>
            <Badge count={result.ui_elements.length} size="small" />
          </div>
        )}

        {/* 执行日志 */}
        {result.logs && result.logs.length > 0 && (
          <div>
            <Text type="secondary" className="text-xs">执行日志:</Text>
            <div className="max-h-32 overflow-y-auto bg-gray-50 dark:bg-gray-800 p-2 rounded text-xs">
              {result.logs.map((log, index) => (
                <div key={index} className="text-gray-600 dark:text-gray-300">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 错误详情 */}
        {!result.success && result.error_details && (
          <Alert
            message="错误详情"
            description={
              <div className="text-xs whitespace-pre-wrap break-all">
                {result.error_details}
              </div>
            }
            type="error"
            showIcon
          />
        )}

        {/* 提取数据 */}
        {result.extracted_data && Object.keys(result.extracted_data).length > 0 && (
          <div>
            <Text type="secondary" className="text-xs">提取数据:</Text>
            <div className="bg-blue-50 dark:bg-blue-900 p-2 rounded text-xs">
              <pre>{JSON.stringify(result.extracted_data, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>

      <Divider style={{ margin: '8px 0' }} />

      {/* 操作按钮 */}
      <div className="flex justify-between">
        <TestResultCopyButton testResult={result} stepName={stepName} />
        <Button 
          size="small" 
          type="text" 
          onClick={onClear}
        >
          清除结果
        </Button>
      </div>
    </div>
  );
};

/**
 * 测试结果标题组件
 */
export const TestResultTitle: React.FC<{ stepName: string }> = ({ stepName }) => (
  <Space>
    <BugOutlined />
    <span>测试结果: {stepName}</span>
  </Space>
);

export default TestResultDetail;