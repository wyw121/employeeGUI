/**
 * 动作执行器组件
 * 执行选中元素的各种动作
 */

import React, { useState } from 'react';
import { 
  Button, 
  Space, 
  Select, 
  Input, 
  Typography, 
  Alert,
  Spin,
  message,
} from 'antd';
import { 
  ThunderboltOutlined,
  EditOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { UIElementEntity, ElementAction } from '../../domain/page-analysis';
import { useElementActions } from '../../application/page-analysis';

const { Text } = Typography;
const { Option } = Select;

export interface ActionExecutorProps {
  deviceId: string;
  selectedElements: UIElementEntity[];
  onActionComplete?: (success: boolean, message: string) => void;
}

export const ActionExecutor: React.FC<ActionExecutorProps> = ({
  deviceId,
  selectedElements,
  onActionComplete,
}) => {
  const [selectedAction, setSelectedAction] = useState<ElementAction>(ElementAction.CLICK);
  const [inputText, setInputText] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  
  const { clickElement, longClickElement, inputTextToElement, swipeElement } = useElementActions();

  const getAvailableActions = () => {
    if (selectedElements.length === 0) return [];
    
    // 找出所有选中元素共同支持的动作
    const commonActions = selectedElements[0].supportedActions.filter(action =>
      selectedElements.every(element => element.supportedActions.includes(action))
    );
    
    return commonActions;
  };

  const executeAction = async () => {
    if (selectedElements.length === 0) {
      message.warning('请先选择元素');
      return;
    }

    setIsExecuting(true);
    
    try {
      let successCount = 0;
      let failCount = 0;
      
      for (const element of selectedElements) {
        let success = false;
        
        switch (selectedAction) {
          case ElementAction.CLICK:
            success = await clickElement(element);
            break;
            
          case ElementAction.LONG_CLICK:
            success = await longClickElement(element, 1000);
            break;
            
          case ElementAction.INPUT_TEXT:
            if (inputText.trim()) {
              success = await inputTextToElement(element, inputText);
            } else {
              message.warning('请输入文本内容');
              continue;
            }
            break;
            
          case ElementAction.SWIPE_UP:
            success = await swipeElement(element, 'up');
            break;
            
          case ElementAction.SWIPE_DOWN:
            success = await swipeElement(element, 'down');
            break;
            
          case ElementAction.SWIPE_LEFT:
            success = await swipeElement(element, 'left');
            break;
            
          case ElementAction.SWIPE_RIGHT:
            success = await swipeElement(element, 'right');
            break;
            
          default:
            message.warning(`暂不支持动作: ${selectedAction}`);
            continue;
        }
        
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
        
        // 在操作间添加小延迟
        if (selectedElements.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      const resultMessage = `执行完成: 成功 ${successCount} 个，失败 ${failCount} 个`;
      onActionComplete?.(failCount === 0, resultMessage);
      
    } catch (error) {
      const errorMessage = `执行失败: ${error instanceof Error ? error.message : '未知错误'}`;
      onActionComplete?.(false, errorMessage);
    } finally {
      setIsExecuting(false);
    }
  };

  const getActionDisplayName = (action: ElementAction) => {
    const actionNames = {
      [ElementAction.CLICK]: '点击',
      [ElementAction.LONG_CLICK]: '长按',
      [ElementAction.INPUT_TEXT]: '输入文本',
      [ElementAction.CLEAR_TEXT]: '清除文本',
      [ElementAction.SWIPE_UP]: '向上滑动',
      [ElementAction.SWIPE_DOWN]: '向下滑动',
      [ElementAction.SWIPE_LEFT]: '向左滑动',
      [ElementAction.SWIPE_RIGHT]: '向右滑动',
      [ElementAction.SCROLL_TO]: '滚动到',
      [ElementAction.SET_SWITCH_STATE]: '设置开关',
      [ElementAction.SELECT_OPTION]: '选择选项',
    };
    
    return actionNames[action] || action;
  };

  const availableActions = getAvailableActions();

  if (selectedElements.length === 0) {
    return (
      <Alert
        message="请先选择要操作的元素"
        type="info"
        showIcon
        style={{ margin: '16px 0' }}
      />
    );
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {/* 动作选择 */}
      <div>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>
          选择动作
        </Text>
        <Select
          value={selectedAction}
          onChange={setSelectedAction}
          style={{ width: '100%' }}
          size="small"
          placeholder="选择要执行的动作"
        >
          {availableActions.map(action => (
            <Option key={action} value={action}>
              {getActionDisplayName(action)}
            </Option>
          ))}
        </Select>
      </div>

      {/* 输入文本框 (仅在输入动作时显示) */}
      {selectedAction === ElementAction.INPUT_TEXT && (
        <div>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            输入内容
          </Text>
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="请输入要填写的文本..."
            size="small"
            prefix={<EditOutlined />}
          />
        </div>
      )}

      {/* 执行按钮 */}
      <div>
        <Button
          type="primary"
          block
          icon={isExecuting ? <Spin size="small" /> : <ThunderboltOutlined />}
          onClick={executeAction}
          loading={isExecuting}
          disabled={availableActions.length === 0}
        >
          {isExecuting 
            ? `正在执行... (${selectedElements.length}个元素)`
            : `执行动作 (${selectedElements.length}个元素)`
          }
        </Button>
      </div>

      {/* 提示信息 */}
      <div>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          将对选中的 {selectedElements.length} 个元素执行"{getActionDisplayName(selectedAction)}"操作
        </Text>
      </div>
    </Space>
  );
};