/**
 * AppLifecycleManager 前端集成示例
 * 展示如何从 React/TypeScript 前端调用应用生命周期管理功能
 */

import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

// 类型定义
interface FrontendAppLaunchConfig {
  maxRetries: number;
  launchTimeoutSecs: number;
  readyCheckIntervalMs: number;
  launchMethod: 'ActivityManager' | 'MonkeyRunner' | 'DesktopIcon';
  packageName?: string;
}

interface AppLifecycleResult {
  finalState: string;
  totalDurationMs: number;
  retryCount: number;
  executionLogs: string[];
  message?: string; // 在错误情况下可能存在
}

// React 组件示例
export const AppLifecycleExample: React.FC = () => {
  const [deviceId, setDeviceId] = useState('');
  const [appName, setAppName] = useState('小红书');
  const [packageName, setPackageName] = useState('com.xingin.xhs');
  const [isLaunching, setIsLaunching] = useState(false);
  const [result, setResult] = useState<AppLifecycleResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 基本应用启动功能
  const handleLaunchApp = async () => {
    if (!deviceId || !appName) {
      setError('请填写设备ID和应用名称');
      return;
    }

    setIsLaunching(true);
    setError(null);
    setResult(null);

    try {
      const config: FrontendAppLaunchConfig = {
        maxRetries: 3,
        launchTimeoutSecs: 30,
        readyCheckIntervalMs: 2000,
        launchMethod: 'ActivityManager',
        packageName: packageName || undefined,
      };

      console.log('🚀 开始启动应用:', { deviceId, appName, config });

      const launchResult = await invoke<AppLifecycleResult>('ensure_app_running', {
        deviceId,
        appName,
        config,
      });

      console.log('✅ 应用启动成功:', launchResult);
      setResult(launchResult);
    } catch (err: any) {
      console.error('❌ 应用启动失败:', err);
      setError(err.message || '未知错误');
    } finally {
      setIsLaunching(false);
    }
  };

  // 检测应用状态功能
  const handleCheckAppState = async () => {
    if (!deviceId || !appName) {
      setError('请填写设备ID和应用名称');
      return;
    }

    try {
      const appState = await invoke<string>('detect_app_state', {
        deviceId,
        appName,
        packageName: packageName || null,
      });

      console.log('📱 应用当前状态:', appState);
      alert(`应用 "${appName}" 的当前状态: ${appState}`);
    } catch (err: any) {
      console.error('❌ 状态检测失败:', err);
      setError(err.message || '状态检测失败');
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🚀 应用生命周期管理</h1>
      
      {/* 配置表单 */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-4">📱 设备和应用配置</h2>
        
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">设备ID</label>
            <input
              type="text"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="例如: emulator-5554"
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">应用名称</label>
            <input
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="例如: 小红书"
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">包名 (可选)</label>
            <input
              type="text"
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              placeholder="例如: com.xingin.xhs"
              className="w-full p-2 border rounded"
            />
            <small className="text-gray-500">留空则系统自动推断</small>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={handleLaunchApp}
          disabled={isLaunching}
          className={`px-6 py-2 rounded font-medium ${
            isLaunching
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {isLaunching ? '🔄 启动中...' : '🚀 启动应用'}
        </button>
        
        <button
          onClick={handleCheckAppState}
          disabled={isLaunching}
          className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded font-medium"
        >
          🔍 检测状态
        </button>
      </div>

      {/* 错误显示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 mb-6">
          <h3 className="text-red-800 font-medium">❌ 错误信息</h3>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* 成功结果显示 */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded p-4 mb-6">
          <h3 className="text-green-800 font-medium">✅ 启动成功</h3>
          <div className="mt-2 space-y-2 text-sm">
            <div><strong>最终状态:</strong> {result.finalState}</div>
            <div><strong>总耗时:</strong> {result.totalDurationMs}ms</div>
            <div><strong>重试次数:</strong> {result.retryCount}</div>
            
            {result.executionLogs && result.executionLogs.length > 0 && (
              <div>
                <strong>执行日志:</strong>
                <div className="mt-1 bg-white p-2 rounded border max-h-32 overflow-y-auto">
                  {result.executionLogs.map((log, index) => (
                    <div key={index} className="text-xs font-mono text-gray-600">
                      {index + 1}. {log}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 使用说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded p-4">
        <h3 className="text-blue-800 font-medium mb-2">💡 使用说明</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>1. 确保设备已连接并启用ADB调试</li>
          <li>2. 输入正确的设备ID（可通过 adb devices 查看）</li>
          <li>3. 输入要启动的应用名称</li>
          <li>4. 包名可选，系统会尝试自动推断</li>
          <li>5. 点击"启动应用"开始自动化流程</li>
          <li>6. 点击"检测状态"可查看应用当前状态</li>
        </ul>
      </div>
    </div>
  );
};

// 工具函数：批量应用管理示例
export const BatchAppLauncher: React.FC = () => {
  const [deviceId, setDeviceId] = useState('');
  const [isLaunching, setIsLaunching] = useState(false);
  const [results, setResults] = useState<Array<{ app: string; success: boolean; result?: AppLifecycleResult; error?: string }>>([]);

  // 预定义的应用列表
  const predefinedApps = [
    { name: '小红书', package: 'com.xingin.xhs' },
    { name: '微信', package: 'com.tencent.mm' },
    { name: '支付宝', package: 'com.eg.android.AlipayGphone' },
    { name: '抖音', package: 'com.ss.android.ugc.aweme' },
  ];

  const handleBatchLaunch = async () => {
    if (!deviceId) {
      alert('请输入设备ID');
      return;
    }

    setIsLaunching(true);
    setResults([]);

    const batchResults = [];

    for (const app of predefinedApps) {
      console.log(`🚀 正在启动: ${app.name}`);

      const config: FrontendAppLaunchConfig = {
        maxRetries: 2,
        launchTimeoutSecs: 30,
        readyCheckIntervalMs: 2000,
        launchMethod: 'ActivityManager',
        packageName: app.package,
      };

      try {
        const result = await invoke<AppLifecycleResult>('ensure_app_running', {
          deviceId,
          appName: app.name,
          config,
        });

        batchResults.push({
          app: app.name,
          success: true,
          result,
        });

        console.log(`✅ ${app.name} 启动成功`);
        
        // 应用间延迟，避免系统过载
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error: any) {
        batchResults.push({
          app: app.name,
          success: false,
          error: error.message || '未知错误',
        });

        console.error(`❌ ${app.name} 启动失败:`, error);
      }
    }

    setResults(batchResults);
    setIsLaunching(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">📱 批量应用启动管理</h1>
      
      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">设备ID</label>
        <input
          type="text"
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          placeholder="例如: emulator-5554"
          className="w-full p-2 border rounded max-w-md"
        />
      </div>

      <button
        onClick={handleBatchLaunch}
        disabled={isLaunching}
        className={`px-6 py-2 rounded font-medium mb-6 ${
          isLaunching
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-purple-500 hover:bg-purple-600 text-white'
        }`}
      >
        {isLaunching ? '🔄 批量启动中...' : '🚀 批量启动应用'}
      </button>

      {/* 预定义应用列表 */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h3 className="font-medium mb-2">📋 将要启动的应用:</h3>
        <div className="grid grid-cols-2 gap-2">
          {predefinedApps.map((app, index) => (
            <div key={index} className="text-sm">
              <strong>{app.name}</strong> - {app.package}
            </div>
          ))}
        </div>
      </div>

      {/* 批量结果显示 */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">📊 批量启动结果</h3>
          {results.map((result, index) => (
            <div
              key={index}
              className={`border rounded p-4 ${
                result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                  {result.success ? '✅' : '❌'}
                </span>
                <strong>{result.app}</strong>
              </div>
              
              {result.success && result.result && (
                <div className="text-sm text-gray-600">
                  <div>状态: {result.result.finalState}</div>
                  <div>耗时: {result.result.totalDurationMs}ms</div>
                  <div>重试: {result.result.retryCount}次</div>
                </div>
              )}
              
              {!result.success && result.error && (
                <div className="text-sm text-red-600">
                  错误: {result.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AppLifecycleExample;