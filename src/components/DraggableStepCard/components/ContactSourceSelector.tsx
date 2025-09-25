import React from 'react';
import { Button } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { open } from '@tauri-apps/plugin-dialog';

interface ContactSourceSelectorProps {
  step: any;
  onUpdateStepParameters?: (id: string, nextParams: any) => void;
}

export const ContactSourceSelector: React.FC<ContactSourceSelectorProps> = ({ step, onUpdateStepParameters }) => {
  const handleSelectSourceFile = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Text', extensions: ['txt'] }],
    });
    if (selected) {
      const file = Array.isArray(selected) ? selected[0] : selected;
      onUpdateStepParameters?.(step.id, {
        ...(step.parameters || {}),
        source_file_path: file,
      });
    }
  };

  return (
    <div className="mt-2">
      <Button 
        size="small"
        type="dashed"
        icon={<EditOutlined />}
        onClick={(e) => {
          e.stopPropagation();
          handleSelectSourceFile();
        }}
        style={{ fontSize: '12px' }}
      >
        {step.parameters?.source_file_path ? '更换源文件' : '选择txt文件'}
      </Button>
      {step.parameters?.source_file_path && (
        <div className="mt-1 text-xs text-blue-600">
          📄 {step.parameters.source_file_path.split('/').pop() || step.parameters.source_file_path.split('\\').pop()}
        </div>
      )}
    </div>
  );
};

export default ContactSourceSelector;
