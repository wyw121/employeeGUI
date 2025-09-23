import React from 'react';
import { Space, Button, Tooltip } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, ArrowLeftOutlined, ArrowRightOutlined } from '@ant-design/icons';

export type ScrollDirection = 'up' | 'down' | 'left' | 'right';

interface ScrollDirectionSelectorProps {
  value?: ScrollDirection;
  onChange?: (dir: ScrollDirection) => void;
  size?: 'small' | 'middle' | 'large';
}

export const ScrollDirectionSelector: React.FC<ScrollDirectionSelectorProps> = ({
  value = 'down',
  onChange,
  size = 'small',
}) => {
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  const renderBtn = (dir: ScrollDirection, icon: React.ReactNode, title: string) => (
    <Tooltip title={title}>
      <Button
        size={size}
        type={value === dir ? 'primary' : 'default'}
        onClick={(e) => { e.stopPropagation(); onChange?.(dir); }}
        onPointerDown={stop}
        onMouseDown={stop}
        onTouchStart={stop}
      >
        {icon}
      </Button>
    </Tooltip>
  );

  return (
    <Space
      onPointerDown={stop}
      onMouseDown={stop}
      onTouchStart={stop}
      onClick={stop}
    >
      {renderBtn('up', <ArrowUpOutlined />, '向上滚动')}
      {renderBtn('down', <ArrowDownOutlined />, '向下滚动')}
      {renderBtn('left', <ArrowLeftOutlined />, '向左滚动')}
      {renderBtn('right', <ArrowRightOutlined />, '向右滚动')}
    </Space>
  );
};

export default ScrollDirectionSelector;
