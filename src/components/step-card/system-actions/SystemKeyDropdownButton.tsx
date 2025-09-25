import React from 'react';
import { Dropdown, Button, MenuProps } from 'antd';
import { ApiOutlined } from '@ant-design/icons';
import { SystemKeyTemplates } from './systemKeyTemplates';

export interface SystemKeyDropdownButtonProps {
  onSelectTemplate: (tpl: ReturnType<typeof SystemKeyTemplates.back>) => void;
  size?: 'small' | 'middle' | 'large';
}

const stopAll = (e: React.SyntheticEvent) => { e.preventDefault(); e.stopPropagation(); };

export const SystemKeyDropdownButton: React.FC<SystemKeyDropdownButtonProps> = ({ onSelectTemplate, size = 'middle' }) => {
  const items: MenuProps['items'] = [
    { type: 'group', label: '系统按键', children: [
      { key: 'back', label: '🔙 返回键', onClick: () => onSelectTemplate(SystemKeyTemplates.back()) },
      { key: 'home', label: '🏠 首页键', onClick: () => onSelectTemplate(SystemKeyTemplates.home()) },
      { key: 'app', label: '🗂️ 最近任务', onClick: () => onSelectTemplate(SystemKeyTemplates.appSwitch()) },
      { key: 'menu', label: '📋 菜单键', onClick: () => onSelectTemplate(SystemKeyTemplates.menu()) },
      { key: 'power', label: '⏻ 电源键', onClick: () => onSelectTemplate(SystemKeyTemplates.power()) },
      { key: 'lock', label: '🔒 锁屏', onClick: () => onSelectTemplate(SystemKeyTemplates.lock()) },
    ]}
  ];

  return (
    <div onClick={stopAll} onMouseDown={stopAll} onPointerDown={stopAll} onTouchStart={stopAll}>
      <Dropdown menu={{ items }} trigger={["click"]} placement="bottomLeft">
        <Button icon={<ApiOutlined />} size={size}>
          🔑 系统按键步骤
        </Button>
      </Dropdown>
    </div>
  );
};

export default SystemKeyDropdownButton;
