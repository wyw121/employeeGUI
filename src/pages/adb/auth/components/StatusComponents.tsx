import React from 'react';
import { Alert, Space, Typography } from 'antd';
import { ExclamationCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { AuthError, AuthStatus } from '../types';

const { Text } = Typography;

export interface StatusIndicatorProps {
  status: AuthStatus;
  title: string;
  description?: React.ReactNode;
  showIcon?: boolean;
}

/**
 * 状态指示器组件
 * 根据不同的状态显示不同的样式和图标
 */
export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  title,
  description,
  showIcon = true,
}) => {
  const getAlertType = () => {
    switch (status) {
      case AuthStatus.SUCCESS:
        return 'success' as const;
      case AuthStatus.ERROR:
        return 'error' as const;
      case AuthStatus.IN_PROGRESS:
        return 'info' as const;
      default:
        return 'info' as const;
    }
  };

  const getIcon = () => {
    if (!showIcon) return undefined;
    
    switch (status) {
      case AuthStatus.SUCCESS:
        return <CheckCircleOutlined />;
      case AuthStatus.ERROR:
        return <CloseCircleOutlined />;
      case AuthStatus.IN_PROGRESS:
        return <ExclamationCircleOutlined />;
      default:
        return <ExclamationCircleOutlined />;
    }
  };

  return (
    <Alert
      type={getAlertType()}
      showIcon={showIcon}
      icon={getIcon()}
      message={title}
      description={description}
    />
  );
};

export interface ErrorListProps {
  errors: AuthError[];
  maxVisible?: number;
  onClear?: () => void;
}

/**
 * 错误列表组件
 * 显示错误信息列表，支持清空和限制显示数量
 */
export const ErrorList: React.FC<ErrorListProps> = ({
  errors,
  maxVisible = 5,
  onClear,
}) => {
  if (errors.length === 0) return null;

  const visibleErrors = errors.slice(-maxVisible);
  const hiddenCount = errors.length - visibleErrors.length;

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {hiddenCount > 0 && (
        <Text type="secondary">还有 {hiddenCount} 个错误未显示</Text>
      )}
      
      {visibleErrors.map((error, index) => (
        <Alert
          key={`${error.code}-${error.timestamp}-${index}`}
          type="error"
          showIcon
          message={error.code}
          description={error.message}
          closable
          onClose={onClear}
        />
      ))}
    </Space>
  );
};

export interface StepHeaderProps {
  title: string;
  description?: React.ReactNode;
  status?: AuthStatus;
  progress?: {
    current: number;
    total: number;
  };
  actions?: React.ReactNode;
}

/**
 * 步骤头部组件
 * 显示步骤标题、描述、状态和操作按钮
 */
export const StepHeader: React.FC<StepHeaderProps> = ({
  title,
  description,
  status = AuthStatus.IDLE,
  progress,
  actions,
}) => {
  const getStatusText = () => {
    switch (status) {
      case AuthStatus.SUCCESS:
        return '完成';
      case AuthStatus.ERROR:
        return '失败';
      case AuthStatus.IN_PROGRESS:
        return '进行中...';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case AuthStatus.SUCCESS:
        return '#52c41a';
      case AuthStatus.ERROR:
        return '#ff4d4f';
      case AuthStatus.IN_PROGRESS:
        return '#1890ff';
      default:
        return undefined;
    }
  };

  return (
    <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
      <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
        <Space align="center">
          <Typography.Title level={4} style={{ margin: 0 }}>
            {title}
          </Typography.Title>
          {progress && (
            <Text type="secondary">
              ({progress.current}/{progress.total})
            </Text>
          )}
          {status !== AuthStatus.IDLE && (
            <Text style={{ color: getStatusColor() }}>
              {getStatusText()}
            </Text>
          )}
        </Space>
        
        {actions && (
          <Space>{actions}</Space>
        )}
      </Space>
      
      {description && (
        <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
          {description}
        </Typography.Paragraph>
      )}
    </Space>
  );
};

export interface ActionButtonGroupProps {
  primaryAction?: {
    text: string;
    onClick: () => void;
    loading?: boolean;
    disabled?: boolean;
    icon?: React.ReactNode;
  };
  secondaryActions?: Array<{
    text: string;
    onClick: () => void;
    loading?: boolean;
    disabled?: boolean;
    icon?: React.ReactNode;
    type?: 'default' | 'primary' | 'dashed' | 'text' | 'link';
  }>;
  layout?: 'horizontal' | 'vertical';
}

/**
 * 操作按钮组组件
 * 统一的按钮布局和样式
 */
export const ActionButtonGroup: React.FC<ActionButtonGroupProps> = ({
  primaryAction,
  secondaryActions = [],
  layout = 'horizontal',
}) => {
  const allActions = [
    ...secondaryActions.map(action => ({ ...action, type: action.type || 'default' as const })),
    ...(primaryAction ? [{ ...primaryAction, type: 'primary' as const }] : []),
  ];

  if (allActions.length === 0) return null;

  return (
    <Space 
      direction={layout === 'horizontal' ? 'horizontal' : 'vertical'}
      style={{ width: layout === 'vertical' ? '100%' : 'auto' }}
    >
      {allActions.map((action, index) => {
        const { text, onClick, loading, disabled, icon, type } = action;
        
        return (
          <button
            key={index}
            className={`ant-btn ant-btn-${type}`}
            onClick={onClick}
            disabled={disabled || loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              ...(layout === 'vertical' ? { width: '100%', justifyContent: 'center' } : {})
            }}
          >
            {loading && <span className="ant-btn-loading-icon" />}
            {!loading && icon}
            <span>{text}</span>
          </button>
        );
      })}
    </Space>
  );
};