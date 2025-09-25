import React, { useState } from 'react';
import { Dropdown, Button, MenuProps } from 'antd';
import { MobileOutlined } from '@ant-design/icons';
import { ScreenActionTemplates, createScrollStepsBatch, createScrollStepTemplate } from './screenTemplates';
import { CustomScrollModal } from './CustomScrollModal';
import { EdgeBackGestureModal } from './EdgeBackGestureModal';

export interface ScreenActionDropdownButtonProps {
  onSelectTemplate: (stepOrSteps: ReturnType<typeof ScreenActionTemplates.scrollDown> | ReturnType<typeof createScrollStepsBatch>) => void;
  size?: 'small' | 'middle' | 'large';
}

// 统一阻断拖拽 & 点击穿透
const stopAll = (e: React.SyntheticEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

export const ScreenActionDropdownButton: React.FC<ScreenActionDropdownButtonProps> = ({ onSelectTemplate, size = 'middle' }) => {
  const [openCustom, setOpenCustom] = useState(false);
  const [openEdgeCustom, setOpenEdgeCustom] = useState(false);
  const items: MenuProps['items'] = [
    { type: 'group', label: '单步滚动', children: [
      { key: 'scrollDown', label: '📜 向下滚动', onClick: () => onSelectTemplate(ScreenActionTemplates.scrollDown()) },
      { key: 'scrollUp', label: '📜 向上滚动', onClick: () => onSelectTemplate(ScreenActionTemplates.scrollUp()) },
      { key: 'scrollLeft', label: '📜 向左滚动', onClick: () => onSelectTemplate(ScreenActionTemplates.scrollLeft()) },
      { key: 'scrollRight', label: '📜 向右滚动', onClick: () => onSelectTemplate(ScreenActionTemplates.scrollRight()) },
    ] },
    { type: 'group', label: '全面屏返回手势', children: [
      { key: 'edgeBackLeft', label: '⬅️ 左边缘 → 右滑（返回）', onClick: () => onSelectTemplate(ScreenActionTemplates.backGestureFromLeft()) },
      { key: 'edgeBackRight', label: '➡️ 右边缘 → 左滑（返回）', onClick: () => onSelectTemplate(ScreenActionTemplates.backGestureFromRight()) },
    ] },
    { key: 'edgeCustom', label: '🛠️ 自定义边缘返回…', onClick: () => setOpenEdgeCustom(true) },
    { type: 'group', label: '批量滚动', children: [
      { key: 'scrollDown3', label: '📜 向下滚动 ×3', onClick: () => onSelectTemplate(createScrollStepsBatch('down', 3)) },
      { key: 'scrollUp3', label: '📜 向上滚动 ×3', onClick: () => onSelectTemplate(createScrollStepsBatch('up', 3)) },
      { key: 'scrollDown5', label: '📜 滚动到底部 ×5', onClick: () => onSelectTemplate(createScrollStepsBatch('down', 5)) },
      { key: 'scrollUp5', label: '📜 滚动到顶部 ×5', onClick: () => onSelectTemplate(createScrollStepsBatch('up', 5)) },
    ]},
    { type: 'divider' },
    { key: 'custom', label: '🛠️ 自定义滚动…', onClick: () => setOpenCustom(true) },
  ];

  return (
    <div onClick={stopAll} onMouseDown={stopAll} onPointerDown={stopAll} onTouchStart={stopAll}>
      <Dropdown menu={{ items }} trigger={["click"]} placement="bottomLeft">
        <Button icon={<MobileOutlined />} size={size}>
          📲 屏幕交互步骤
        </Button>
      </Dropdown>
      <CustomScrollModal
        open={openCustom}
        onCancel={() => setOpenCustom(false)}
        onConfirm={(cfg) => {
          setOpenCustom(false);
          const { direction, distance, speed_ms, times } = cfg;
          if (times > 1) {
            onSelectTemplate(createScrollStepsBatch(direction, times, { distance, speed_ms }));
          } else {
            onSelectTemplate(createScrollStepTemplate(direction, { distance, speed_ms }));
          }
        }}
      />
      <EdgeBackGestureModal
        open={openEdgeCustom}
        onCancel={() => setOpenEdgeCustom(false)}
        onConfirm={(cfg) => {
          setOpenEdgeCustom(false);
          onSelectTemplate(ScreenActionTemplates.createEdgeBackFromConfig(cfg));
        }}
      />
    </div>
  );
};

export default ScreenActionDropdownButton;
