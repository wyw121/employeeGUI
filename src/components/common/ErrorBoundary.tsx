import React from 'react';

type Props = {
  fallback?: React.ReactNode;
  onReset?: () => void;
  children: React.ReactNode;
};

type State = { hasError: boolean; error?: any };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    // eslint-disable-next-line no-console
    try { console.error('[ErrorBoundary] caught error:', error, errorInfo); } catch {}
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div style={{ padding: 16 }}>
            <div style={{ marginBottom: 8 }}>模块加载失败（可能是开发服务器重启中）。</div>
            <button onClick={this.reset} style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: 4 }}>重试</button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
