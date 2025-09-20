import React, { Component, ReactNode } from 'react';
import { Alert, Button, Card } from 'antd';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // 更新 state 使下一次渲染能够显示降级后的 UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 可以将错误日志上报给服务器
    console.error('错误边界捕获到错误:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // 自定义降级 UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card style={{ margin: '20px' }}>
          <Alert
            message="组件渲染出错"
            description={
              <div>
                <p>组件在渲染过程中遇到了错误，这可能是由于：</p>
                <ul>
                  <li>数据格式不匹配</li>
                  <li>组件状态更新循环</li>
                  <li>属性传递异常</li>
                </ul>
                <div style={{ marginTop: '16px' }}>
                  <Button type="primary" onClick={this.handleReset}>
                    重新加载组件
                  </Button>
                </div>
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details style={{ marginTop: '16px' }}>
                    <summary style={{ cursor: 'pointer', color: '#666' }}>
                      查看错误详情 (开发模式)
                    </summary>
                    <pre style={{ 
                      background: '#f5f5f5', 
                      padding: '12px', 
                      fontSize: '12px',
                      overflow: 'auto',
                      marginTop: '8px'
                    }}>
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </div>
            }
            type="error"
            showIcon
          />
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;