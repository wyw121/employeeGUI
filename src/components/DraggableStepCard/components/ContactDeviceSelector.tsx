import React from 'react';
import { Button } from 'antd';
import { SettingOutlined } from '@ant-design/icons';

interface ContactDeviceSelectorProps {
  step: any;
  devices: any[];
}

export const ContactDeviceSelector: React.FC<ContactDeviceSelectorProps> = ({ step, devices }) => {
  const handleSelectDevice = () => {
    // 交互提示留给上层列表或设备面板，这里仅呈现按钮与状态
    // 可按需扩展为弹出选择器
  };

  const onlineCount = devices.filter(d => d.status === 'online').length;

  return (
    <div className="mt-2">
      <Button 
        size="small"
        type="dashed"
        icon={<SettingOutlined />}
        onClick={(e) => {
          e.stopPropagation();
          handleSelectDevice();
        }}
        style={{ fontSize: '12px' }}
        disabled={onlineCount === 0}
      >
        {step.parameters?.selected_device_id ? '更换设备' : '选择设备'}
      </Button>
      {step.parameters?.selected_device_id && (
        <div className="mt-1 text-xs text-green-600">
          📱 {devices.find(d => d.id === step.parameters.selected_device_id)?.name || step.parameters.selected_device_id}
        </div>
      )}
      {onlineCount === 0 && (
        <div className="mt-1 text-xs text-red-500">
          ⚠️ 没有在线设备可选择
        </div>
      )}
    </div>
  );
};

export default ContactDeviceSelector;
