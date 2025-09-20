import React from 'react';
import { Popconfirm } from 'antd';
import { CheckOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import type { UIElement } from '../../../api/universalUIAPI';

export interface ElementSelectionState {
  element: UIElement;
  position: { x: number; y: number };
  confirmed: boolean;
}

export interface ElementSelectionPopoverProps {
  visible: boolean;
  selection: ElementSelectionState | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ElementSelectionPopover: React.FC<ElementSelectionPopoverProps> = ({
  visible,
  selection,
  onConfirm,
  onCancel
}) => {
  if (!visible || !selection) {
    return null;
  }

  return (
    <div
      key={`selection-${selection.element.id}`}
      style={{
        position: 'fixed',
        left: selection.position.x + 10,
        top: selection.position.y + 10, // 调整为鼠标下方，配合placement="top"
        zIndex: 10000,
        pointerEvents: 'none',
      }}
    >
      <Popconfirm
        open={visible}
        title={
          <div style={{ maxWidth: '200px' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
              选择此元素？
            </div>
            <div style={{ fontSize: '13px', fontWeight: 'bold' }}>
              {selection.element.text || 
               selection.element.resource_id || 
               selection.element.class_name || '未知元素'}
            </div>
          </div>
        }
        description=""
        okText={
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckOutlined />
            确定
          </span>
        }
        cancelText={
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <EyeInvisibleOutlined />
            隐藏
          </span>
        }
        onConfirm={(e) => {
          if (e) e.stopPropagation();
          onConfirm();
        }}
        onCancel={(e) => {
          if (e) e.stopPropagation();
          onCancel();
        }}
        placement="top" // 气泡在鼠标上方显示，箭头指向下方（鼠标位置）
        arrow={{ pointAtCenter: true }}
        getPopupContainer={() => document.body} // 确保在 body 中渲染
      >
        {/* 不可见的触发器 */}
        <div style={{ 
          width: 1, 
          height: 1, 
          opacity: 0,
          pointerEvents: 'auto' // 允许这个触发器接收事件
        }} />
      </Popconfirm>
    </div>
  );
};