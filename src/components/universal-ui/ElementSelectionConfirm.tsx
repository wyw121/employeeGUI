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

  // 计算气泡位置和箭头方向
  const calculateBubblePosition = () => {
    const bubble = { width: 200, height: 80 };
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    
    let x = position.x - bubble.width / 2;
    let y = position.y;
    let arrowDirection: 'top' | 'bottom' = 'bottom';
    let arrowLeft = bubble.width / 2;

    // 优先在元素上方显示气泡
    if (position.y > bubble.height + 20) {
      y = position.y - bubble.height - 15;
      arrowDirection = 'bottom';
    } else {
      y = position.y + 15;
      arrowDirection = 'top';
    }

    // 水平方向调整，避免超出视口
    if (x < 10) {
      arrowLeft = position.x - 10;
      x = 10;
    } else if (x + bubble.width > viewport.width - 10) {
      arrowLeft = position.x - (viewport.width - bubble.width - 10);
      x = viewport.width - bubble.width - 10;
    }

    // 确保箭头在合理范围内
    arrowLeft = Math.max(15, Math.min(arrowLeft, bubble.width - 15));

    return { x, y, arrowDirection, arrowLeft };
  };

  const { x, y, arrowDirection, arrowLeft } = calculateBubblePosition();

  // 气泡样式
  const bubbleStyle: React.CSSProperties = {
    position: 'absolute',
    left: x,
    top: y,
    width: '200px',
    zIndex: 9999,
    background: 'white',
    border: '1px solid #e8e8e8',
    borderRadius: '8px',
    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.12)',
    padding: '12px',
  };

  // 箭头样式
  const arrowStyle: React.CSSProperties = {
    position: 'absolute',
    left: arrowLeft - 6,
    width: 0,
    height: 0,
    border: '6px solid transparent',
    ...(arrowDirection === 'bottom' 
      ? {
          top: -12,
          borderBottomColor: 'white',
        }
      : {
          bottom: -12,
          borderTopColor: 'white',
        }
    ),
  };

  // 箭头边框样式
  const arrowBorderStyle: React.CSSProperties = {
    position: 'absolute',
    left: arrowLeft - 7,
    width: 0,
    height: 0,
    border: '7px solid transparent',
    ...(arrowDirection === 'bottom' 
      ? {
          top: -14,
          borderBottomColor: '#e8e8e8',
        }
      : {
          bottom: -14,
          borderTopColor: '#e8e8e8',
        }
    ),
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
      
      {/* 气泡确认框 */}
      <div style={bubbleStyle}>
        {/* 箭头边框 */}
        <div style={arrowBorderStyle} />
        {/* 箭头 */}
        <div style={arrowStyle} />
        
        {/* 元素信息 */}
        <div style={{ marginBottom: '10px', textAlign: 'center' }}>
          <div style={{ 
            fontSize: '11px', 
            color: '#8c8c8c',
            marginBottom: '2px'
          }}>
            选择元素
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: '#262626',
            fontWeight: '500',
            wordBreak: 'break-all',
            lineHeight: '1.3',
            maxHeight: '24px',
            overflow: 'hidden'
          }}>
            {getElementDisplayName()}
          </div>
        </div>

        {/* 操作按钮 */}
        <div style={{ 
          display: 'flex', 
          gap: '6px',
          justifyContent: 'center'
        }}>
          <Button
            size="small"
            icon={<EyeInvisibleOutlined />}
            onClick={onHide}
            style={{
              fontSize: '11px',
              height: '28px',
              borderColor: '#faad14',
              color: '#faad14',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#ffc53d';
              e.currentTarget.style.color = '#ffc53d';
              e.currentTarget.style.backgroundColor = '#fffbe6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#faad14';
              e.currentTarget.style.color = '#faad14';
              e.currentTarget.style.backgroundColor = 'transparent';
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
              fontSize: '11px',
              height: '28px',
              backgroundColor: '#52c41a',
              borderColor: '#52c41a',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
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