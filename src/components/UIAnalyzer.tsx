import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface UIElement {
  text: string;
  resource_id: string;
  class: string;
  package: string;
  content_desc: string;
  clickable: boolean;
  bounds: string;
}

interface DeviceUIState {
  device_id: string;
  xml_content: string;
  elements: UIElement[];
  timestamp: string;
  page_type: string;
  suggested_action: string;
}

const UIAnalyzer: React.FC = () => {
  const [deviceId, setDeviceId] = useState('emulator-5554');
  const [uiState, setUiState] = useState<DeviceUIState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // 读取UI状态
  const readUIState = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 开始读取设备UI状态:', deviceId);
      const result = await invoke<DeviceUIState>('read_device_ui_state', {
        deviceId: deviceId,
      });
      
      console.log('✅ UI状态读取成功:', result);
      setUiState(result);
    } catch (err) {
      console.error('❌ UI状态读取失败:', err);
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  // 自动刷新
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoRefresh) {
      interval = setInterval(() => {
        readUIState();
      }, 3000); // 每3秒刷新一次
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoRefresh, deviceId]);

  // 查找特定UI元素
  const findElements = async (elementType: string, searchValue: string) => {
    try {
      const elements = await invoke<UIElement[]>('find_ui_elements', {
        deviceId: deviceId,
        elementType: elementType,
        searchValue: searchValue,
      });
      
      console.log(`找到 ${elements.length} 个匹配元素:`, elements);
      alert(`找到 ${elements.length} 个匹配的UI元素，详情请查看控制台`);
    } catch (err) {
      console.error('查找UI元素失败:', err);
      setError(err as string);
    }
  };

  // 格式化元素显示
  const formatElement = (element: UIElement, index: number) => (
    <div key={index} className="border border-gray-300 rounded p-3 mb-2 bg-gray-50">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div><strong>Text:</strong> {element.text || '(空)'}</div>
        <div><strong>可点击:</strong> {element.clickable ? '✅' : '❌'}</div>
        <div><strong>类名:</strong> <span className="font-mono text-xs">{element.class}</span></div>
        <div><strong>资源ID:</strong> <span className="font-mono text-xs">{element.resource_id || '(无)'}</span></div>
        <div><strong>内容描述:</strong> {element.content_desc || '(无)'}</div>
        <div><strong>位置:</strong> <span className="font-mono text-xs">{element.bounds}</span></div>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-center text-blue-600">
          🔍 设备UI状态分析器
        </h1>

        {/* 控制面板 */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="font-medium">设备ID:</label>
              <input
                type="text"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1 w-40"
                placeholder="emulator-5554"
              />
            </div>
            
            <button
              onClick={readUIState}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {loading ? '🔄 读取中...' : '📱 读取UI状态'}
            </button>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoRefresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="autoRefresh" className="font-medium">自动刷新 (3秒)</label>
            </div>
          </div>

          {/* 快速查找工具 */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => findElements('clickable', 'true')}
              className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
            >
              查找可点击元素
            </button>
            <button
              onClick={() => findElements('text', 'vcf')}
              className="bg-purple-500 text-white px-3 py-1 rounded text-sm hover:bg-purple-600"
            >
              查找VCF相关元素
            </button>
            <button
              onClick={() => findElements('text', '联系人')}
              className="bg-orange-500 text-white px-3 py-1 rounded text-sm hover:bg-orange-600"
            >
              查找联系人相关元素
            </button>
          </div>
        </div>

        {/* 错误显示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-red-600 font-medium mb-2">❌ 错误信息</h3>
            <p className="text-red-700 text-sm font-mono">{error}</p>
          </div>
        )}

        {/* UI状态显示 */}
        {uiState && (
          <div className="space-y-6">
            {/* 状态概览 */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-green-600 font-medium mb-3">📊 状态概览</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <strong>设备ID:</strong>
                  <div className="font-mono">{uiState.device_id}</div>
                </div>
                <div>
                  <strong>读取时间:</strong>
                  <div className="font-mono">{uiState.timestamp}</div>
                </div>
                <div>
                  <strong>页面类型:</strong>
                  <div className="font-mono text-blue-600">{uiState.page_type}</div>
                </div>
                <div>
                  <strong>建议操作:</strong>
                  <div className="font-mono text-purple-600">{uiState.suggested_action}</div>
                </div>
              </div>
            </div>

            {/* 可点击元素 */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-yellow-600 font-medium mb-3">
                👆 可点击元素 ({uiState.elements.filter(e => e.clickable).length} 个)
              </h3>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {uiState.elements
                  .filter(e => e.clickable)
                  .slice(0, 10) // 只显示前10个
                  .map((element, index) => formatElement(element, index))}
              </div>
              {uiState.elements.filter(e => e.clickable).length > 10 && (
                <p className="text-sm text-gray-500 mt-2">... 还有更多元素，总共 {uiState.elements.filter(e => e.clickable).length} 个</p>
              )}
            </div>

            {/* 有文本的元素 */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="text-purple-600 font-medium mb-3">
                📝 文本元素 ({uiState.elements.filter(e => e.text.trim().length > 0).length} 个)
              </h3>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {uiState.elements
                  .filter(e => e.text.trim().length > 0)
                  .slice(0, 10)
                  .map((element, index) => formatElement(element, index))}
              </div>
            </div>

            {/* XML源码 */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-gray-600 font-medium mb-3">
                🔧 XML源码 ({uiState.xml_content.length} 字符)
              </h3>
              <textarea
                value={uiState.xml_content}
                readOnly
                className="w-full h-40 p-3 border border-gray-300 rounded font-mono text-xs bg-white"
                placeholder="XML内容将显示在这里..."
              />
            </div>
          </div>
        )}

        {/* 使用说明 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-blue-600 font-medium mb-2">💡 使用说明</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 确保设备已连接并可通过ADB访问</li>
            <li>• 点击"读取UI状态"可获取当前屏幕的所有UI元素</li>
            <li>• 页面类型会自动识别当前应用界面</li>
            <li>• 建议操作会根据当前状态推荐下一步操作</li>
            <li>• 可以开启自动刷新实时监控UI变化</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UIAnalyzer;