import React from 'react';
import { Button, message } from 'antd';
import { EditOutlined, EyeOutlined } from '@ant-design/icons';

interface ContactActionsProps {
  step: any;
  devices: any[];
}

export const ContactActions: React.FC<ContactActionsProps> = ({ step, devices }) => {
  if (step.step_type === 'contact_generate_vcf') {
    const src = step.parameters?.source_file_path as string | undefined;
    return (
      <div className="mt-2">
        <Button
          size="small"
          type="dashed"
          icon={<EditOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            message.info('请选择txt文件（已在旧版中实现文件选择逻辑，请在上层集成）');
          }}
          style={{ fontSize: 12 }}
        >
          {src ? '更换源文件' : '选择txt文件'}
        </Button>
        {src && (
          <div className="mt-1 text-xs text-blue-600">📄 {src.split('/').pop() || src.split('\\').pop()}</div>
        )}
      </div>
    );
  }

  if (step.step_type === 'contact_import_to_device') {
    const selected = step.parameters?.selected_device_id as string | undefined;
    const hasOnline = devices.filter((d) => d.status === 'online').length > 0;
    return (
      <div className="mt-2">
        <Button
          size="small"
          type="dashed"
          icon={<EyeOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            message.info('请在设备列表中选择目标设备');
          }}
          style={{ fontSize: 12 }}
          disabled={!hasOnline}
        >
          {selected ? '更换设备' : '选择设备'}
        </Button>
        {selected && <div className="mt-1 text-xs text-green-600">📱 {selected}</div>}
        {!hasOnline && <div className="mt-1 text-xs text-red-500">⚠️ 没有在线设备可选择</div>}
      </div>
    );
  }

  return null;
};

export default ContactActions;
