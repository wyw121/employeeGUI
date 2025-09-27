import React, { useState } from 'react';
import {
  Button,
  Tooltip,
  Popover,
  Badge,
} from 'antd';
import {
  PlayCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { useSingleStepTest } from '../hooks/useSingleStepTest';
import type { SmartScriptStep } from '../types/smartScript';
import { TestResultDetail, TestResultTitle } from './step-card';
import { useAdb } from '../application/hooks/useAdb';

interface StepTestButtonProps {
  step: SmartScriptStep;
  /**
   * 可选：指定设备ID；若未提供，将自动选择：selectedDevice?.id → 首台在线设备 → 首台设备
   */
  deviceId?: string;
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
  const { devices, selectedDevice } = useAdb();
  const [showResultPopover, setShowResultPopover] = useState(false);
  
  const isTesting = isStepTesting(step.id);
  const testResult = getStepTestResult(step.id);

  // 阻断拖拽相关的事件传播（适配 dnd-kit）
  const stopDragPropagation = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  // 计算有效设备ID（自动选择）
  const effectiveDeviceId: string | undefined = (() => {
    if (deviceId && deviceId.trim()) return deviceId;
    if (selectedDevice?.id) return selectedDevice.id;
    // 优先首台在线设备
    const firstOnline = devices.find(d => (d as any).isOnline?.());
    if (firstOnline?.id) return firstOnline.id;
    // 退化为列表首台
    return devices[0]?.id;
  })();

  const handleTest = async () => {
    if (!effectiveDeviceId) {
      return;
    }
    
    try {
      await executeSingleStep(step, effectiveDeviceId);
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

  const buttonProps = getButtonProps();

  const testButton = (
    <Button
      {...buttonProps}
      size={size}
      disabled={disabled || isTesting || !effectiveDeviceId}
      onClick={handleTest}
      style={{ minWidth: size === 'small' ? 60 : 80 }}
    >
      {isTesting ? '测试中' : '测试'}
    </Button>
  );

  // 如果有测试结果，显示弹出框
  if (testResult) {
    return (
      <span
        onPointerDown={stopDragPropagation}
        onPointerDownCapture={stopDragPropagation}
        onMouseDown={stopDragPropagation}
        onMouseDownCapture={stopDragPropagation}
        onTouchStart={stopDragPropagation}
        onTouchStartCapture={stopDragPropagation}
        onClick={stopDragPropagation}
      >
        <Popover
          content={
            <TestResultDetail
              result={testResult}
              stepName={step.name}
              onClear={() => {
                clearStepResult(step.id);
                setShowResultPopover(false);
              }}
            />
          }
          title={<TestResultTitle stepName={step.name} />}
          trigger="click"
          placement="topLeft"
          open={showResultPopover}
          onOpenChange={setShowResultPopover}
          getPopupContainer={(triggerNode) => (triggerNode?.parentNode as HTMLElement) || document.body}
        >
          <Badge 
            dot 
            status={testResult.success ? 'success' : 'error'}
            offset={[-2, 2]}
          >
            {testButton}
          </Badge>
        </Popover>
      </span>
    );
  }

  // 没有测试结果，显示提示
  return (
    <span
      onPointerDown={stopDragPropagation}
      onPointerDownCapture={stopDragPropagation}
      onMouseDown={stopDragPropagation}
      onMouseDownCapture={stopDragPropagation}
      onTouchStart={stopDragPropagation}
      onTouchStartCapture={stopDragPropagation}
      onClick={stopDragPropagation}
    >
      <Tooltip 
        title={
          !effectiveDeviceId 
            ? '没有可用设备（请连接至少一台设备）' 
            : `点击测试步骤: ${step.name}`
        }
        placement="top"
        getPopupContainer={(triggerNode) => (triggerNode?.parentNode as HTMLElement) || document.body}
      >
        {testButton}
      </Tooltip>
    </span>
  );
};

export default StepTestButton;