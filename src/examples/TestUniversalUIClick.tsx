// 快速测试 execute_universal_ui_click 命令是否正常工作
// 测试文件：src/examples/TestUniversalUIClick.tsx

import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

interface SmartNavigationParams {
  navigation_type?: string;
  target_button: string;
  click_action?: string;
  app_name?: string;
  position_ratio?: {
    x_start: number;
    x_end: number;
    y_start: number;
    y_end: number;
  };
  custom_config?: any;
}

interface UniversalClickResult {
  success: boolean;
  element_found: boolean;
  click_executed: boolean;
  execution_time_ms: number;
  error_message?: string;
  found_element?: {
    text: string;
    bounds: string;
    position: [number, number];
  };
  mode: string;
}

export const TestUniversalUIClick: React.FC = () => {
  const [deviceId, setDeviceId] = useState('emulator-5554');
  const [isTesting, setIsTesting] = useState(false);
  const [result, setResult] = useState<UniversalClickResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const testDirectAdbMode = async () => {
    setIsTesting(true);
    setError(null);
    setResult(null);

    const params: SmartNavigationParams = {
      navigation_type: 'bottom',
      target_button: '我',
      click_action: 'single_tap',
      // 不设置 app_name，使用直接ADB模式
    };

    try {
      console.log('🧪 测试直接ADB模式:', { deviceId, params });
      
      const clickResult = await invoke<UniversalClickResult>('execute_universal_ui_click', {
        deviceId,
        params,
      });

      console.log('✅ 测试成功:', clickResult);
      setResult(clickResult);
      
    } catch (err: any) {
      console.error('❌ 测试失败:', err);
      setError(err.message || err.toString());
    } finally {
      setIsTesting(false);
    }
  };

  const testSpecificAppMode = async () => {
    setIsTesting(true);
    setError(null);
    setResult(null);

    const params: SmartNavigationParams = {
      navigation_type: 'bottom',
      target_button: '我',
      click_action: 'single_tap',
      app_name: '小红书', // 设置应用名称，使用指定应用模式
    };

    try {
      console.log('🧪 测试指定应用模式:', { deviceId, params });
      
      const clickResult = await invoke<UniversalClickResult>('execute_universal_ui_click', {
        deviceId,
        params,
      });

      console.log('✅ 测试成功:', clickResult);
      setResult(clickResult);
      
    } catch (err: any) {
      console.error('❌ 测试失败:', err);
      setError(err.message || err.toString());
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🧪 Universal UI Click 命令测试</h1>
      
      {/* 设备ID配置 */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <label className="block text-sm font-medium mb-1">设备ID</label>
        <input
          type="text"
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          placeholder="例如: emulator-5554"
          className="w-full p-2 border rounded"
        />
      </div>

      {/* 测试按钮 */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={testDirectAdbMode}
          disabled={isTesting}
          className={`px-6 py-2 rounded font-medium ${
            isTesting
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {isTesting ? '🔄 测试中...' : '🚀 测试直接ADB模式'}
        </button>
        
        <button
          onClick={testSpecificAppMode}
          disabled={isTesting}
          className={`px-6 py-2 rounded font-medium ${
            isTesting
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {isTesting ? '🔄 测试中...' : '📱 测试指定应用模式'}
        </button>
      </div>

      {/* 错误显示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 mb-6">
          <h3 className="text-red-800 font-medium">❌ 错误信息</h3>
          <p className="text-red-700 mt-1 font-mono text-sm">{error}</p>
        </div>
      )}

      {/* 成功结果显示 */}
      {result && (
        <div className={`border rounded p-4 mb-6 ${
          result.success ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
        }`}>
          <h3 className={`font-medium ${
            result.success ? 'text-green-800' : 'text-yellow-800'
          }`}>
            {result.success ? '✅ 执行成功' : '⚠️ 执行完成（可能有问题）'}
          </h3>
          
          <div className="mt-2 space-y-2 text-sm">
            <div><strong>执行模式:</strong> {result.mode}</div>
            <div><strong>执行时间:</strong> {result.execution_time_ms}ms</div>
            <div><strong>元素找到:</strong> {result.element_found ? '✅' : '❌'}</div>
            <div><strong>点击执行:</strong> {result.click_executed ? '✅' : '❌'}</div>
            
            {result.error_message && (
              <div><strong>错误信息:</strong> <span className="text-red-600">{result.error_message}</span></div>
            )}
            
            {result.found_element && (
              <div>
                <strong>找到的元素:</strong>
                <div className="mt-1 bg-white p-2 rounded border">
                  <div>文本: {result.found_element.text}</div>
                  <div>边界: {result.found_element.bounds}</div>
                  <div>位置: [{result.found_element.position[0]}, {result.found_element.position[1]}]</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 使用说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded p-4">
        <h3 className="text-blue-800 font-medium mb-2">💡 测试说明</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li><strong>直接ADB模式:</strong> 不启动特定应用，直接在当前界面查找"我"按钮</li>
          <li><strong>指定应用模式:</strong> 先确保小红书应用运行，再查找"我"按钮</li>
          <li><strong>设备要求:</strong> 确保设备已连接且开启ADB调试</li>
          <li><strong>预期行为:</strong> 查找并点击底部导航栏的"我"按钮</li>
        </ul>
      </div>
    </div>
  );
};

export default TestUniversalUIClick;