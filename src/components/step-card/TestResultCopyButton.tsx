import React, { useState } from 'react';
import { Button, message, Tooltip } from 'antd';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';
import type { SingleStepTestResult } from '../../types/smartScript';
import { formatTestResultForCopy, copyToClipboard } from './testResultUtils';

interface TestResultCopyButtonProps {
  testResult: SingleStepTestResult;
  stepName: string;
  size?: 'small' | 'middle' | 'large';
}

/**
 * 测试结果复制按钮组件，用于一键复制格式化的测试结果
 */
export const TestResultCopyButton: React.FC<TestResultCopyButtonProps> = ({
  testResult,
  stepName,
  size = 'small'
}) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    // 格式化测试结果
    const formattedResult = formatTestResultForCopy(testResult, stepName);
    
    // 复制到剪贴板
    const success = await copyToClipboard(formattedResult);
    
    // 显示反馈
    if (success) {
      setCopied(true);
      message.success('已复制测试结果到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } else {
      message.error('复制失败，请重试');
    }
  };
  
  return (
    <Tooltip title="复制完整测试结果">
      <Button
        type="text"
        size={size}
        icon={copied ? <CheckOutlined style={{ color: 'var(--success, #22c55e)' }} /> : <CopyOutlined />}
        onClick={handleCopy}
        className={copied ? 'text-green-500' : ''}
      >
        {copied ? '已复制' : '复制结果'}
      </Button>
    </Tooltip>
  );
};

export default TestResultCopyButton;