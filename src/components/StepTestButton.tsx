import React, { useState } from 'react';
import {
  Button,
  Tooltip,
  Popover,
  Space,
  Badge,
  Typography,
  Divider,
  Tag,
  Alert
} from 'antd';
import {
  PlayCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  InfoCircleOutlined,
  BugOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useSingleStepTest } from '../hooks/useSingleStepTest';
import type { SmartScriptStep, SingleStepTestResult } from '../types/smartScript';

const { Text, Paragraph } = Typography;

interface StepTestButtonProps {
  step: SmartScriptStep;
  deviceId: string;
  size?: 'small' | 'middle' | 'large';
  disabled?: boolean;
}

export const StepTestButton: React.FC<StepTestButtonProps> = ({
  step,
  deviceId,
  size = 'small',
  disabled = false
}) => {
  const { executeSingleStep, getStepTestResult, isStepTesting, clearStepResult } = useSingleStepTest();
  const [showResultPopover, setShowResultPopover] = useState(false);
  
  const isTesting = isStepTesting(step.id);
  const testResult = getStepTestResult(step.id);

  // 处理测试执行
  const handleTest = async () => {
    if (!deviceId) {
      return;
    }
    
    try {
      await executeSingleStep(step, deviceId);
    } catch (error) {
      console.error('单步测试失败:', error);
    }
  };

  // 获取按钮状态和样式
  const getButtonProps = () => {
    if (isTesting) {
      return {
        type: 'primary' as const,
        icon: <LoadingOutlined />,
        loading: true,
        className: 'animate-pulse'
      };
    }

    if (testResult) {
      if (testResult.success) {
        return {
          type: 'default' as const,
          icon: <CheckCircleOutlined />,
          className: 'text-green-600 border-green-300 hover:border-green-400'
        };
      } else {
        return {
          type: 'default' as const,
          icon: <CloseCircleOutlined />,
          className: 'text-red-600 border-red-300 hover:border-red-400'
        };
      }
    }

    return {
      type: 'default' as const,
      icon: <PlayCircleOutlined />,
      className: 'text-blue-600 border-blue-300 hover:border-blue-400'
    };
  };

  // 渲染测试结果详情
  const renderTestResult = (result: SingleStepTestResult) => (
    <div style={{ maxWidth: 300 }}>
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

      <div className="space-y-2">
        <div>
          <Text type="secondary" className="text-xs">执行消息:</Text>
          <Paragraph className="text-xs mb-1" copyable>
            {result.message}
          </Paragraph>
        </div>

        {result.page_state && (
          <div>
            <Text type="secondary" className="text-xs">页面状态:</Text>
            <Tag color="blue">{result.page_state}</Tag>
          </div>
        )}

        {result.ui_elements && result.ui_elements.length > 0 && (
          <div>
            <Text type="secondary" className="text-xs">找到元素:</Text>
            <Badge count={result.ui_elements.length} size="small" />
          </div>
        )}

        {result.logs && result.logs.length > 0 && (
          <div>
            <Text type="secondary" className="text-xs">执行日志:</Text>
            <div className="max-h-20 overflow-y-auto bg-gray-50 p-2 rounded text-xs">
              {result.logs.map((log, index) => (
                <div key={index} className="text-gray-600">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}

        {!result.success && result.error_details && (
          <Alert
            message="错误详情"
            description={result.error_details}
            type="error"
            showIcon
          />
        )}

        {result.extracted_data && Object.keys(result.extracted_data).length > 0 && (
          <div>
            <Text type="secondary" className="text-xs">提取数据:</Text>
            <div className="bg-blue-50 p-2 rounded text-xs">
              <pre>{JSON.stringify(result.extracted_data, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>

      <Divider style={{ margin: '8px 0' }} />

      <div className="flex justify-end">
        <Button 
          size="small" 
          type="text" 
          onClick={() => {
            clearStepResult(step.id);
            setShowResultPopover(false);
          }}
        >
          清除结果
        </Button>
      </div>
    </div>
  );

  const buttonProps = getButtonProps();

  const testButton = (
    <Button
      {...buttonProps}
      size={size}
      disabled={disabled || isTesting || !deviceId}
      onClick={handleTest}
      style={{ minWidth: size === 'small' ? 60 : 80 }}
    >
      {isTesting ? '测试中' : '测试'}
    </Button>
  );

  // 如果有测试结果，显示弹出框
  if (testResult) {
    return (
      <Popover
        content={renderTestResult(testResult)}
        title={
          <Space>
            <BugOutlined />
            <span>测试结果: {step.name}</span>
          </Space>
        }
        trigger="click"
        placement="topLeft"
        open={showResultPopover}
        onOpenChange={setShowResultPopover}
      >
        <Badge 
          dot 
          status={testResult.success ? 'success' : 'error'}
          offset={[-2, 2]}
        >
          {testButton}
        </Badge>
      </Popover>
    );
  }

  // 没有测试结果，显示提示
  return (
    <Tooltip 
      title={
        !deviceId 
          ? '请先选择设备' 
          : `点击测试步骤: ${step.name}`
      }
      placement="top"
    >
      {testButton}
    </Tooltip>
  );
};

export default StepTestButton;