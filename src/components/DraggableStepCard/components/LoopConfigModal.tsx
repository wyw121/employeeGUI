import React from 'react';
import { Modal, Divider, Switch, InputNumber, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

const { Text } = Typography;

export interface LoopConfigModalProps {
  open: boolean;
  stepType: string;
  loopCount: number;
  isInfiniteLoop: boolean;
  onChangeLoopCount: (val: number) => void;
  onChangeInfinite: (val: boolean) => void;
  onOk: () => void;
  onCancel: () => void;
}

export const LoopConfigModal: React.FC<LoopConfigModalProps> = ({
  open,
  stepType,
  loopCount,
  isInfiniteLoop,
  onChangeLoopCount,
  onChangeInfinite,
  onOk,
  onCancel,
}) => {
  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ReloadOutlined style={{ color: '#3b82f6' }} />
          <span>
            {stepType === 'loop_start'
              ? '🔄 循环开始配置'
              : stepType === 'loop_end'
              ? '🏁 循环结束配置'
              : '设置循环次数'}
          </span>
        </div>
      }
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      okText="保存"
      cancelText="取消"
      width={400}
    >
      <div style={{ padding: '20px 0' }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text strong>无限循环模式：</Text>
              <span style={{ fontSize: 16 }}>∞</span>
            </div>
            <Switch
              checked={isInfiniteLoop}
              onChange={(checked) => {
                onChangeInfinite(checked);
                if (checked) onChangeLoopCount(3);
              }}
              checkedChildren="开启"
              unCheckedChildren="关闭"
            />
          </div>
          {isInfiniteLoop && (
            <div style={{ padding: 12, backgroundColor: '#fff7ed', borderRadius: 6, border: '1px solid #fed7aa' }}>
              <Text type="warning" style={{ fontSize: 12 }}>⚠️ 警告：无限循环将持续执行直到手动停止，请谨慎使用！</Text>
            </div>
          )}
        </div>

        <Divider />

        <div style={{ marginBottom: 16 }}>
          <Text strong>循环执行次数：</Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <InputNumber
            min={1}
            max={100}
            value={loopCount}
            onChange={(value) => onChangeLoopCount(value || 1)}
            style={{ width: 120 }}
            addonAfter="次"
            disabled={isInfiniteLoop}
          />
          <Text type="secondary">
            {isInfiniteLoop ? '已启用无限循环模式 ∞' : `当前设置为执行 ${loopCount} 次`}
          </Text>
        </div>

        <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f0f9ff', borderRadius: 6, border: '1px solid #bae6fd' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            💡 提示：{isInfiniteLoop
              ? '无限循环模式下，循环体内的步骤将不断重复执行，直到手动停止或出现错误。'
              : stepType === 'loop_start'
              ? '循环体内的所有步骤将重复执行指定次数，类似多次点击"执行智能脚本"按钮。'
              : stepType === 'loop_end'
              ? '当执行到循环结束卡片时，如果还未达到设定次数，将返回循环开始处继续执行。'
              : '循环体内的所有步骤将重复执行指定次数。'}
          </Text>
        </div>
      </div>
    </Modal>
  );
};

export default LoopConfigModal;
