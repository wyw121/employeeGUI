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
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <div
      className="light-surface"
      style={{ maxWidth: 400 }}
      onPointerDown={stop}
      onPointerDownCapture={stop}
      onMouseDown={stop}
      onMouseDownCapture={stop}
      onTouchStart={stop}
      onTouchStartCapture={stop}
      onClick={stop}
    >
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

        {/* 策略匹配信息 */}
        {result.extracted_data?.matchCriteria && (
          <div>
            <Text type="secondary" className="text-xs">匹配策略:</Text>
            <div className="space-y-1">
              <Tag color="cyan">{result.extracted_data.matchCriteria.strategy}</Tag>
              {result.extracted_data.matchCriteria.fields.length > 0 && (
                <div className="text-xs">
                  <Text type="secondary">匹配字段: </Text>
                  {result.extracted_data.matchCriteria.fields.map((field: string) => (
                    <Tag key={field} color="blue" style={{ fontSize: '11px' }}>{field}</Tag>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 找到元素 */}
        {result.ui_elements && result.ui_elements.length > 0 && (
          <div>
            <Text type="secondary" className="text-xs">找到元素:</Text>
            <Badge count={result.ui_elements.length} size="small" />
            {/* 显示匹配预览 */}
            {result.ui_elements[0] && typeof result.ui_elements[0] === 'object' && (
              <div className="mt-1 bg-gray-50 dark:bg-gray-800 p-2 rounded text-xs">
                {Object.entries(result.ui_elements[0]).map(([key, value]) => (
                  value && <div key={key} className="text-gray-600 dark:text-gray-300">
                    <span className="font-medium">{key}:</span> {String(value)}
                  </div>
                ))}
              </div>
            )}
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

        {/* 循环汇总（若存在） */}
        {result.extracted_data?.loopSummary && (
          <div>
            <Text type="secondary" className="text-xs">循环汇总:</Text>
            <div className="text-xs mt-1">
              <div>
                <span className="font-medium">请求次数:</span> {result.extracted_data.loopSummary.requested}
              </div>
              <div>
                <span className="font-medium">执行次数:</span> {result.extracted_data.loopSummary.executed}
              </div>
              <div>
                <span className="font-medium">成功:</span> {result.extracted_data.loopSummary.successCount}
              </div>
              <div>
                <span className="font-medium">失败:</span> {result.extracted_data.loopSummary.failureCount}
              </div>
              <div>
                <span className="font-medium">总耗时:</span> {result.extracted_data.loopSummary.totalDuration}ms
              </div>
            </div>
          </div>
        )}

        {/* 循环每次执行明细（若存在） */}
        {Array.isArray(result.extracted_data?.iterations) && result.extracted_data.iterations.length > 0 && (
          <div>
            <Text type="secondary" className="text-xs">循环明细:</Text>
            <div className="max-h-32 overflow-y-auto bg-gray-50 dark:bg-gray-800 p-2 rounded text-xs">
              {result.extracted_data.iterations.map((it: any) => (
                <div key={it.index} className="text-gray-600 dark:text-gray-300">
                  第 {it.index} 次 - {it.success ? '成功' : '失败'} - {it.duration_ms}ms
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
        <div
          onPointerDown={stop}
          onPointerDownCapture={stop}
          onMouseDown={stop}
          onMouseDownCapture={stop}
          onTouchStart={stop}
          onTouchStartCapture={stop}
          onClick={stop}
        >
          <TestResultCopyButton testResult={result} stepName={stepName} />
        </div>
        <Button 
          size="small" 
          type="text" 
          onClick={(e) => { e.stopPropagation(); onClear(); }}
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
  <div className="light-surface">
    <Space>
      <BugOutlined />
      <span>测试结果: {stepName}</span>
    </Space>
  </div>
);

export default TestResultDetail;