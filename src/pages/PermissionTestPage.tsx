import { invoke } from '@tauri-apps/api/core';
import React, { useState } from 'react';
import { ImportStrategyDialog } from '../modules/contact-import/import-strategies/ui/ImportStrategyDialog';
import { App } from 'antd';

interface PermissionTestPageProps {}

const PermissionTestPage: React.FC<PermissionTestPageProps> = () => {
  const [deviceId, setDeviceId] = useState('emulator-5556');
  const [contactsFile, setContactsFile] = useState('D:\\repositories\\employeeGUI\\test_contacts_permission.txt');
  const [testResult, setTestResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showStrategyDialog, setShowStrategyDialog] = useState(false);
  const { message } = App.useApp();

  const testPermissionHandling = async () => {
    setIsLoading(true);
    setTestResult('正在测试权限对话框处理...');
    
    try {
      const result = await invoke('test_permission_handling', {
        deviceId: deviceId
      });
      setTestResult(`权限处理测试结果: ${result}`);
    } catch (error) {
      setTestResult(`权限处理测试失败: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportStrategySelect = (result: any) => {
    // 这里可以处理导入结果
    setTestResult(`VCF导入测试成功: ${JSON.stringify(result, null, 2)}`);
    message.success('VCF导入测试成功');
    setShowStrategyDialog(false);
  };

  return (
    <App>
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">权限处理测试页面</h1>
      
      {/* 设备配置 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">设备配置</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              设备ID
            </label>
            <input
              type="text"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="例如: emulator-5556"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              联系人文件路径
            </label>
            <input
              type="text"
              value={contactsFile}
              onChange={(e) => setContactsFile(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="联系人文件完整路径"
            />
          </div>
        </div>
      </div>

      {/* 测试操作 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">测试操作</h2>
        
        <div className="flex flex-wrap gap-4 mb-4">
          <button
            onClick={testPermissionHandling}
            disabled={isLoading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
          >
            {isLoading ? '测试中...' : '测试权限对话框处理'}
          </button>
          
          <button
            onClick={() => setShowStrategyDialog(true)}
            disabled={isLoading}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
          >
            {isLoading ? '导入中...' : '测试完整VCF导入（选择策略）'}
          </button>
        </div>
      </div>

      {/* 导入策略选择对话框 */}
      <ImportStrategyDialog
        visible={showStrategyDialog}
        onClose={() => setShowStrategyDialog(false)}
        vcfFilePath={contactsFile}
        onSuccess={handleImportStrategySelect}
      />

      {/* 测试结果 */}
      {testResult && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">测试结果</h2>
          
          <div className="bg-gray-100 p-4 rounded-lg">
            <pre className="whitespace-pre-wrap text-sm font-mono text-gray-800">
              {testResult}
            </pre>
          </div>
        </div>
      )}

      {/* 使用说明 */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              <strong>使用说明：</strong>
            </p>
            <ul className="list-disc list-inside text-sm text-yellow-700 mt-1">
              <li>确保Android设备已连接且ADB可访问</li>
              <li>设备需要安装联系人应用</li>
              <li>测试会自动处理权限对话框</li>
              <li>联系人文件格式：姓名,电话,地址,职业,邮箱</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    </App>
  );
};

export default PermissionTestPage;

