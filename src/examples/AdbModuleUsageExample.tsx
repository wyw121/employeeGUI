/**
 * ADB 诊断模块使用示例
 * 展示如何在应用中集成和使用 ADB 诊断功能
 */

import React from 'react';
import { Button, Card, Space } from 'antd';
import { 
  // 主要组件
  AdbDashboard,
  LogViewer,
  EnhancedDeviceManager,
  
  // 自定义 Hooks
  useLogManager,
  useAdbDiagnostic,
  useDeviceMonitor,
  useNotification,
  
  // 类型定义
  LogLevel,
  LogCategory
} from '../components/adb-diagnostic';

/**
 * 使用示例组件
 */
export const AdbModuleUsageExample: React.FC = () => {
  // 使用日志管理 Hook
  const { addLog, exportLogs } = useLogManager();
  
  // 使用诊断 Hook
  const { 
    isRunning, 
    runFullDiagnostic, 
    autoFixIssues,
    diagnosticResults 
  } = useAdbDiagnostic();
  
  // 使用设备监控 Hook
  const { 
    isMonitoring, 
    startMonitoring, 
    stopMonitoring,
    getMonitorStats 
  } = useDeviceMonitor();
  
  // 使用通知 Hook
  const { success, error } = useNotification();

  // 演示功能
  const handleTestLogging = () => {
    addLog(LogLevel.INFO, LogCategory.SYSTEM, 'AdbModuleExample', '测试日志记录功能');
    success('日志记录', '已成功记录测试日志');
  };

  const handleTestDiagnostic = async () => {
    try {
      await runFullDiagnostic();
      success('诊断完成', 'ADB 系统诊断已完成');
    } catch (err) {
      console.error('诊断失败:', err);
      error('诊断失败', '诊断过程中出现错误');
    }
  };

  const handleTestMonitoring = () => {
    if (isMonitoring) {
      stopMonitoring();
      success('监控停止', '设备监控已停止');
    } else {
      startMonitoring();
      success('监控启动', '设备监控已启动');
    }
  };

  const handleExportLogs = async () => {
    try {
      await exportLogs({ format: 'json', includeDetails: true });
      success('导出成功', '日志已导出到本地');
    } catch (err) {
      console.error('导出失败:', err);
      error('导出失败', '日志导出过程中出现错误');
    }
  };

  const handleAutoFix = async () => {
    try {
      await autoFixIssues(diagnosticResults);
      success('自动修复', '问题自动修复已完成');
    } catch (err) {
      console.error('自动修复失败:', err);
      error('修复失败', '自动修复过程中出现错误');
    }
  };

  const stats = getMonitorStats();

  return (
    <div style={{ padding: '24px' }}>
      <h1>ADB 诊断模块使用示例</h1>
      
      {/* 功能演示区域 */}
      <Card title="功能演示" style={{ marginBottom: '16px' }}>
        <Space wrap>
          <Button onClick={handleTestLogging}>
            测试日志记录
          </Button>
          
          <Button 
            onClick={handleTestDiagnostic} 
            loading={isRunning}
            type="primary"
          >
            运行系统诊断
          </Button>
          
          <Button 
            onClick={handleTestMonitoring}
            type={isMonitoring ? "default" : "primary"}
          >
            {isMonitoring ? '停止监控' : '开始监控'}
          </Button>
          
          <Button onClick={handleExportLogs}>
            导出日志
          </Button>
          
          {diagnosticResults.length > 0 && (
            <Button 
              onClick={handleAutoFix}
              disabled={!diagnosticResults.some(result => result.canAutoFix)}
            >
              自动修复问题
            </Button>
          )}
        </Space>
        
        {/* 状态信息 */}
        <div style={{ marginTop: '16px' }}>
          <p>设备监控状态: {isMonitoring ? '运行中' : '已停止'}</p>
          <p>监控设备数量: {stats.total}</p>
          <p>在线设备: {stats.online}</p>
          <p>离线设备: {stats.offline}</p>
          <p>异常设备: {stats.unhealthy}</p>
          <p>平均健康分数: {stats.averageHealth}</p>
        </div>
      </Card>

      {/* 组件展示区域 */}
      <Card title="主要组件展示" style={{ marginBottom: '16px' }}>
        <h3>1. ADB 仪表板</h3>
        <AdbDashboard />
        
        <h3 style={{ marginTop: '24px' }}>2. 设备管理器</h3>
        <EnhancedDeviceManager />
        
        <h3 style={{ marginTop: '24px' }}>3. 日志查看器</h3>
        <LogViewer />
      </Card>

      {/* 集成说明 */}
      <Card title="集成说明">
        <h3>如何在您的应用中使用</h3>
        <pre style={{ background: '#f5f5f5', padding: '16px', borderRadius: '4px' }}>
{`// 1. 导入所需的组件和 Hooks
import { 
  AdbDashboard, 
  useLogManager, 
  useAdbDiagnostic 
} from '../components/adb-diagnostic';

// 2. 在组件中使用
const MyComponent = () => {
  const { addLog } = useLogManager();
  const { runFullDiagnostic } = useAdbDiagnostic();
  
  return (
    <div>
      <AdbDashboard />
      <Button onClick={() => runFullDiagnostic()}>
        运行诊断
      </Button>
    </div>
  );
};

// 3. 或直接使用完整页面
import { ComprehensiveAdbPage } from '../pages';

const App = () => {
  return <ComprehensiveAdbPage />;
};`}
        </pre>
      </Card>
    </div>
  );
};

export default AdbModuleUsageExample;