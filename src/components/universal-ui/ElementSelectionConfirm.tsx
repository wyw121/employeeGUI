import React from 'react';
import { Button } from 'antd';
import { EyeInvisibleOutlined, CheckOutlined } from '@ant-design/icons';

export interface ElementSelectionConfirmProps {
  /** 是否显示确认面板 */
  visible: boolean;
  /** 面板位置 */
  position: {
    x: number;
    y: number;
  };
  /** 选中的元素信息 */
  element: {
    id: string;
    text: string;
    className?: string;
    resourceId?: string;
  } | null;
  /** 点击确定按钮的回调 */
  onConfirm: () => void;
  /** 点击隐藏按钮的回调 */
  onHide: () => void;
  /** 取消选择的回调 */
  onCancel: () => void;
}

/**
 * 元素选择确认组件
 * 在可视化视图中点击元素后显示的确认面板
 */
export const ElementSelectionConfirm: React.FC<ElementSelectionConfirmProps> = ({
  visible,
  position,
  element,
  onConfirm,
  onHide,
  onCancel,
}) => {
  if (!visible || !element) {
    return null;
  }

  // 计算面板位置，确保不会超出视口
  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    left: Math.max(10, Math.min(position.x, window.innerWidth - 280)),
    top: Math.max(10, Math.min(position.y + 10, window.innerHeight - 120)),
    zIndex: 9999,
    background: 'white',
    border: '1px solid #d9d9d9',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    padding: '12px',
    minWidth: '260px',
    maxWidth: '300px',
  };

  // 获取元素显示名称
  const getElementDisplayName = () => {
    if (element.text && element.text.trim()) {
      return element.text.length > 30 ? `${element.text.substring(0, 30)}...` : element.text;
    }
    if (element.resourceId) {
      return element.resourceId;
    }
    if (element.className) {
      return element.className.split('.').pop() || element.className;
    }
    return element.id;
  };

  return (
    <>
      {/* 遮罩层，点击可取消选择 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'transparent',
          zIndex: 9998,
        }}
        onClick={onCancel}
      />
      
      {/* 确认面板 */}
      <div style={panelStyle}>
        {/* 元素信息 */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ 
            fontSize: '14px', 
            fontWeight: 'bold', 
            color: '#262626',
            marginBottom: '4px'
          }}>
            选中元素
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: '#595959',
            wordBreak: 'break-all',
            lineHeight: '1.4'
          }}>
            {getElementDisplayName()}
          </div>
        </div>

        {/* 操作按钮 */}
        <div style={{ 
          display: 'flex', 
          gap: '8px',
          justifyContent: 'flex-end'
        }}>
          <Button
            size="small"
            icon={<EyeInvisibleOutlined />}
            onClick={onHide}
            style={{
              borderColor: '#faad14',
              color: '#faad14'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#ffc53d';
              e.currentTarget.style.color = '#ffc53d';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#faad14';
              e.currentTarget.style.color = '#faad14';
            }}
          >
            隐藏
          </Button>
          
          <Button
            size="small"
            type="primary"
            icon={<CheckOutlined />}
            onClick={onConfirm}
            style={{
              backgroundColor: '#52c41a',
              borderColor: '#52c41a'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#73d13d';
              e.currentTarget.style.borderColor = '#73d13d';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#52c41a';
              e.currentTarget.style.borderColor = '#52c41a';
            }}
          >
            确定
          </Button>
        </div>
      </div>
    </>
  );
};

export default ElementSelectionConfirm;