import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAdb } from '../application/hooks/useAdb';

interface VcfOpenResult {
  success: boolean;
  message: string;
  details?: string;
  steps_completed: string[];
}

interface DeviceInfo {
  id: string;
  name: string;
  status: 'connected' | 'disconnected';
  type: string;
}

interface DeviceUIState {
  device_id: string;
  xml_content: string;
  elements: Array<{
    text: string;
    resource_id: string;
    class: string;
    package: string;
    content_desc: string;
    clickable: boolean;
    bounds: string;
  }>;
  timestamp: string;
  page_type: string;
  suggested_action: string;
}

const SmartVcfImporter: React.FC = () => {
  const [contactsFile, setContactsFile] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [importResult, setImportResult] = useState<VcfOpenResult | null>(null);
  const [uiState, setUiState] = useState<DeviceUIState | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [autoMonitor, setAutoMonitor] = useState(false);

  // 使用统一的ADB接口 - 遵循DDD架构约束
  const { 
    devices, 
    selectedDevice, 
    selectDevice, 
    onlineDevices,
    refreshDevices,
    initialize
  } = useAdb();

  // 初始化ADB环境
  useEffect(() => {
    const initializeAdb = async () => {
      try {
        await initialize();
        await refreshDevices();
        addLog('📱 ADB环境初始化完成');
      } catch (error) {
        addLog(`❌ ADB初始化失败: ${error}`);
      }
    };

    initializeAdb();
  }, [initialize, refreshDevices]);

  // 当有在线设备时自动选择第一个
  useEffect(() => {
    if (onlineDevices.length > 0 && !selectedDevice) {
      selectDevice(onlineDevices[0].id);
      addLog(`🎯 自动选择设备: ${onlineDevices[0].getDisplayName()}`);
    }
  }, [onlineDevices, selectedDevice, selectDevice]);

  // 读取当前UI状态
  const readCurrentUIState = async () => {
    if (!selectedDevice) {
      addLog('❌ 请先选择设备');
      return;
    }

    try {
      addLog(`🔍 正在读取设备 ${selectedDevice.id} 的UI状态...`);
      
      const state = await invoke<DeviceUIState>('read_device_ui_state', {
        deviceId: selectedDevice.id,
      });
      
      setUiState(state);
      addLog(`✅ UI状态读取成功 - 页面类型: ${state.page_type}`);
      addLog(`💡 建议操作: ${state.suggested_action}`);
    } catch (error) {
      addLog(`❌ 读取UI状态失败: ${error}`);
    }
  };

  // 智能VCF导入
  const startSmartImport = async () => {
    if (!selectedDevice) {
      addLog('❌ 请先选择设备');
      return;
    }

    setIsImporting(true);
    setImportResult(null);
    setCurrentStep('准备开始智能导入...');
    
    try {
      addLog('🤖 启动智能VCF导入流程...');
      
      const result = await invoke<VcfOpenResult>('smart_vcf_opener', {
        deviceId: selectedDevice,
      });
      
      setImportResult(result);
      
      if (result.success) {
        addLog('🎉 智能VCF导入完成！');
        addLog(`✅ 完成步骤: ${result.steps_completed.join(' → ')}`);
      } else {
        addLog(`❌ 导入失败: ${result.message}`);
      }
      
    } catch (error) {
      addLog(`💥 导入过程中发生错误: ${error}`);
      setImportResult({
        success: false,
        message: `导入失败: ${error}`,
        steps_completed: [],
      });
    } finally {
      setIsImporting(false);
      setCurrentStep('');
    }
  };

  // 完整VCF导入流程（包含文件传输）
  const startCompleteImport = async () => {
    if (!selectedDevice || !contactsFile) {
      addLog('❌ 请选择设备和联系人文件');
      return;
    }

    setIsImporting(true);
    setImportResult(null);
    setCurrentStep('开始完整导入流程...');
    
    try {
      addLog('🚀 启动完整VCF导入和打开流程...');
      
      const result = await invoke<VcfOpenResult>('import_and_open_vcf_ldplayer', {
        deviceId: selectedDevice,
        contactsFilePath: contactsFile,
      });
      
      setImportResult(result);
      
      if (result.success) {
        addLog('🎊 完整导入流程成功完成！');
        addLog(`✅ 执行步骤: ${result.steps_completed.join(' → ')}`);
      } else {
        addLog(`❌ 完整导入失败: ${result.message}`);
      }
      
    } catch (error) {
      addLog(`💥 完整导入过程中发生错误: ${error}`);
      setImportResult({
        success: false,
        message: `完整导入失败: ${error}`,
        steps_completed: [],
      });
    } finally {
      setIsImporting(false);
      setCurrentStep('');
    }
  };

  // 添加日志
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // 清空日志
  const clearLogs = () => {
    setLogs([]);
  };

  // 自动监控UI状态
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoMonitor && selectedDevice) {
      interval = setInterval(() => {
        readCurrentUIState();
      }, 5000); // 每5秒刷新一次
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoMonitor, selectedDevice]);

  // 初始化时获取设备列表
  useEffect(() => {
    // 组件挂载时不需要手动加载设备，useAdb会自动处理
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-3xl font-bold text-blue-600">🤖 智能VCF联系人导入器</h1>
          <div className="flex-1"></div>
          <button
            onClick={refreshDevices}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            🔄 刷新设备
          </button>
        </div>

        {/* 设备选择区域 */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="text-blue-600 font-medium mb-3">📱 设备管理</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-2">选择设备:</label>
              <select
                value={selectedDevice?.id || ''}
                onChange={(e) => {
                  const deviceId = e.target.value;
                  const device = onlineDevices.find(d => d.id === deviceId);
                  if (device) {
                    selectDevice(deviceId);
                  }
                }}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">请选择设备</option>
                {onlineDevices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.getDisplayName()} ({device.id}) - 在线
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block font-medium mb-2">联系人文件:</label>
              <input
                type="text"
                value={contactsFile}
                onChange={(e) => setContactsFile(e.target.value)}
                placeholder="选择VCF文件路径..."
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* 操作控制区域 */}
        <div className="bg-green-50 rounded-lg p-4 mb-6">
          <h3 className="text-green-600 font-medium mb-3">🎯 导入控制</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={readCurrentUIState}
              disabled={!selectedDevice || isImporting}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              🔍 读取UI状态
            </button>
            
            <button
              onClick={startSmartImport}
              disabled={!selectedDevice || isImporting}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
            >
              {isImporting ? '🔄 智能导入中...' : '🤖 智能导入 (仅打开)'}
            </button>
            
            <button
              onClick={startCompleteImport}
              disabled={!selectedDevice || !contactsFile || isImporting}
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:bg-gray-400"
            >
              {isImporting ? '🔄 完整导入中...' : '🚀 完整导入 (传输+打开)'}
            </button>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoMonitor"
                checked={autoMonitor}
                onChange={(e) => setAutoMonitor(e.target.checked)}
                disabled={!selectedDevice}
                className="w-4 h-4"
              />
              <label htmlFor="autoMonitor" className="font-medium">自动监控UI (5秒)</label>
            </div>
          </div>
        </div>

        {/* 当前状态显示 */}
        {isImporting && currentStep && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="text-yellow-600 font-medium mb-2">⏳ 当前状态</h3>
            <p className="text-yellow-700">{currentStep}</p>
            <div className="mt-2">
              <div className="animate-pulse flex space-x-1">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        )}

        {/* 导入结果显示 */}
        {importResult && (
          <div className={`${importResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border rounded-lg p-4 mb-6`}>
            <h3 className={`${importResult.success ? 'text-green-600' : 'text-red-600'} font-medium mb-2`}>
              {importResult.success ? '✅ 导入成功' : '❌ 导入失败'}
            </h3>
            <p className={`${importResult.success ? 'text-green-700' : 'text-red-700'} mb-2`}>
              {importResult.message}
            </p>
            {importResult.details && (
              <p className={`${importResult.success ? 'text-green-600' : 'text-red-600'} text-sm`}>
                详情: {importResult.details}
              </p>
            )}
            {importResult.steps_completed.length > 0 && (
              <div className="mt-3">
                <p className="font-medium mb-1">执行步骤:</p>
                <div className="flex flex-wrap gap-2">
                  {importResult.steps_completed.map((step, index) => (
                    <span key={index} className="bg-white px-2 py-1 rounded text-sm border">
                      {index + 1}. {step}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* UI状态显示 */}
        {uiState && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
            <h3 className="text-purple-600 font-medium mb-3">🔍 当前UI状态</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <strong>设备:</strong>
                <div className="font-mono">{uiState.device_id}</div>
              </div>
              <div>
                <strong>时间:</strong>
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
            
            <div className="mt-3">
              <p className="font-medium">UI元素统计:</p>
              <div className="flex gap-4 text-sm mt-1">
                <span>总元素: {uiState.elements.length}</span>
                <span>可点击: {uiState.elements.filter(e => e.clickable).length}</span>
                <span>有文本: {uiState.elements.filter(e => e.text.trim().length > 0).length}</span>
              </div>
            </div>
          </div>
        )}

        {/* 日志显示区域 */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-gray-600 font-medium">📋 操作日志</h3>
            <button
              onClick={clearLogs}
              className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
            >
              清空日志
            </button>
          </div>
          <div className="h-64 overflow-y-auto bg-white rounded border p-3 font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-gray-500">暂无日志记录</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1 hover:bg-gray-50 px-1 rounded">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 使用说明 */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-blue-600 font-medium mb-2">💡 使用说明</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p><strong>智能导入 (仅打开):</strong> 适用于VCF文件已在设备上，只需要自动打开和导入</p>
            <p><strong>完整导入 (传输+打开):</strong> 从本地传输VCF文件到设备，然后自动打开和导入</p>
            <p><strong>自动监控:</strong> 实时监控设备UI状态变化，便于调试和观察</p>
            <p><strong>UI状态读取:</strong> 手动获取当前设备界面状态，了解应用当前状态</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartVcfImporter;

