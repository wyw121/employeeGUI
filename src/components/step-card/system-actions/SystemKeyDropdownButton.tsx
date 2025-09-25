import React, { useState } from 'react';
import { Dropdown, Button, MenuProps } from 'antd';
import { ApiOutlined } from '@ant-design/icons';
import { SystemKeyTemplates } from './systemKeyTemplates';
import { EdgeBackGestureModal } from '../screen-actions/EdgeBackGestureModal';
import { ScreenActionTemplates } from '../screen-actions/screenTemplates';

export interface SystemKeyDropdownButtonProps {
  onSelectTemplate: (tpl: ReturnType<typeof SystemKeyTemplates.back>) => void;
  size?: 'small' | 'middle' | 'large';
}

const stopAll = (e: React.SyntheticEvent) => { e.preventDefault(); e.stopPropagation(); };

export const SystemKeyDropdownButton: React.FC<SystemKeyDropdownButtonProps> = ({ onSelectTemplate, size = 'middle' }) => {
  const [openEdgeCustom, setOpenEdgeCustom] = useState(false);
  const items: MenuProps['items'] = [
    { type: 'group', label: '系统按键', children: [
      { key: 'back', label: '🔙 返回键', onClick: () => onSelectTemplate(SystemKeyTemplates.back()) },
      { key: 'home', label: '🏠 首页键', onClick: () => onSelectTemplate(SystemKeyTemplates.home()) },
      { key: 'app', label: '🗂️ 最近任务', onClick: () => onSelectTemplate(SystemKeyTemplates.appSwitch()) },
      { key: 'menu', label: '📋 菜单键', onClick: () => onSelectTemplate(SystemKeyTemplates.menu()) },
      { key: 'power', label: '⏻ 电源键', onClick: () => onSelectTemplate(SystemKeyTemplates.power()) },
      { key: 'lock', label: '🔒 锁屏', onClick: () => onSelectTemplate(SystemKeyTemplates.lock()) },
    ]},
    { type: 'group', label: '全面屏返回手势', children: [
      { key: 'edgeBackLeft', label: '⬅️ 左边缘 → 右滑（返回）', onClick: () => onSelectTemplate(ScreenActionTemplates.backGestureFromLeft()) },
      { key: 'edgeBackRight', label: '➡️ 右边缘 → 左滑（返回）', onClick: () => onSelectTemplate(ScreenActionTemplates.backGestureFromRight()) },
      { key: 'edgeCustom', label: '🛠️ 自定义边缘返回…', onClick: () => setOpenEdgeCustom(true) },
    ]},
  ];

  return (
    <div onClick={stopAll} onMouseDown={stopAll} onPointerDown={stopAll} onTouchStart={stopAll}>
      <Dropdown menu={{ items }} trigger={["click"]} placement="bottomLeft">
        <Button icon={<ApiOutlined />} size={size}>
          🔑 系统按键步骤
        </Button>
      </Dropdown>
      <EdgeBackGestureModal
        open={openEdgeCustom}
        onCancel={() => setOpenEdgeCustom(false)}
        onConfirm={(cfg) => {
          setOpenEdgeCustom(false);
          // 统一复用屏幕交互模板的生成器
          onSelectTemplate(ScreenActionTemplates.createEdgeBackFromConfig(cfg));
        }}
      />
    </div>
  );
};

export default SystemKeyDropdownButton;
