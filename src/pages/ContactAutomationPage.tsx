import { AlertCircle, CheckCircle, FileDown, Heart, Smartphone, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { ImportAndFollow, VcfImporter, XiaohongshuAutoFollow } from '../components/contact';
import { useAdbDevices } from '../hooks/useAdbDevices';
import { Contact, ImportAndFollowResult, VcfImportResult, XiaohongshuFollowResult } from '../types';

export const ContactAutomationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'vcf-import' | 'auto-follow' | 'complete-flow'>('complete-flow');
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsFilePath, setContactsFilePath] = useState<string>('');
  const [results, setResults] = useState<{
    vcfImport?: VcfImportResult;
    autoFollow?: XiaohongshuFollowResult;
    completeFlow?: ImportAndFollowResult;
  }>({});

  const { devices, isLoading: devicesLoading, error: devicesError, refreshDevices } = useAdbDevices();

  // 处理设备选择
  const handleDeviceSelect = (deviceId: string) => {
    setSelectedDevice(deviceId);
  };

  // 设备状态显示组件
  const renderDeviceStatus = () => {
    if (devicesLoading) {
      return (
        <div className="flex items-center text-gray-600">
          <AlertCircle className="w-4 h-4 mr-2 animate-spin" />
          正在检测设备...
        </div>
      );
    }

    if (devicesError) {
      return (
        <div className="flex items-center text-red-600">
          <AlertCircle className="w-4 h-4 mr-2" />
          设备加载失败: {devicesError}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">
            可用设备 ({devices.length} 个)
          </span>
          <button
            onClick={refreshDevices}
            className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            刷新设备列表
          </button>
        </div>
        {devices.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
            <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <h3 className="text-sm font-medium text-yellow-800">未检测到设备</h3>
            <p className="text-xs text-yellow-600 mt-1">请确保:</p>
            <ul className="text-xs text-yellow-600 mt-1 text-left">
              <li>雷电模拟器正在运行</li>
              <li>ADB服务正常工作</li>
            </ul>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {devices.map((device) => (
              <button
                key={device.id}
                onClick={() => handleDeviceSelect(device.id)}
                className={`p-3 border-2 rounded-md cursor-pointer transition-all text-left w-full ${
                  selectedDevice === device.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center">
                  <Smartphone className="w-4 h-4 text-gray-500 mr-2" />
                  <span className="text-sm font-medium text-gray-800">{device.id}</span>
                </div>
                {selectedDevice === device.id && (
                  <div className="flex items-center mt-1">
                    <CheckCircle className="w-3 h-3 text-green-600 mr-1" />
                    <span className="text-xs text-green-600">已选中</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // 处理联系人文件选择
  const handleContactsFileSelect = () => {
    // 触发文件选择对话框
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.csv,.vcf';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setContactsFilePath(file.name); // Web File API 中没有path属性
        // 这里可以解析文件内容获取联系人列表
        parseContactsFile(file);
      }
    };
    input.click();
  };

  // 解析联系人文件
  const parseContactsFile = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const parsedContacts: Contact[] = [];

      lines.forEach((line, index) => {
        const parts = line.split(',').map(s => s.trim());
        if (parts.length >= 2) {
          parsedContacts.push({
            id: `contact-${index}`,
            name: parts[0],
            phone: parts[1],
            email: parts[4] || '',
            address: parts[2] || '',
            occupation: parts[3] || '',
          } as Contact);
        }
      });

      setContacts(parsedContacts);
    } catch (error) {
      console.error('解析联系人文件失败:', error);
      alert('解析联系人文件失败: ' + error);
    }
  };

  // 处理VCF导入完成
  const handleVcfImportComplete = (result: VcfImportResult) => {
    setResults(prev => ({ ...prev, vcfImport: result }));
  };

  // 处理自动关注完成
  const handleAutoFollowComplete = (result: XiaohongshuFollowResult) => {
    setResults(prev => ({ ...prev, autoFollow: result }));
  };

  // 处理完整流程完成
  const handleCompleteFlowComplete = (result: ImportAndFollowResult) => {
    setResults(prev => ({ ...prev, completeFlow: result }));
  };

  // 清除结果
  const clearResults = () => {
    setResults({});
  };

  useEffect(() => {
    refreshDevices();
  }, []);

  return (
    <div className="contact-automation-page p-6 max-w-7xl mx-auto">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">通讯录自动化</h1>
        <p className="text-gray-600">
          集成了Flow_Farm项目的VCF通讯录导入和小红书自动关注功能，实现一站式联系人管理和社交媒体自动化。
        </p>
      </div>

      {/* 设备选择区域 */}
      <div className="mb-8 bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-4">
          <Smartphone className="w-6 h-6 text-blue-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-800">设备管理</h2>
        </div>

        {renderDeviceStatus()}
      </div>

      {/* 联系人文件选择 */}
      <div className="mb-8 bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-4">
          <Users className="w-6 h-6 text-green-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-800">联系人文件</h2>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleContactsFileSelect}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <FileDown className="w-4 h-4 mr-2" />
            选择联系人文件
          </button>

          {contactsFilePath && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <div>
                  <p className="text-sm text-green-800 font-medium">
                    文件已选择: {contactsFilePath}
                  </p>
                  <p className="text-sm text-green-600">
                    已解析 {contacts.length} 个联系人
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
            <p className="font-medium mb-2">支持的文件格式：</p>
            <ul className="space-y-1 ml-4 list-disc">
              <li><strong>TXT/CSV:</strong> 姓名,电话,地址,职业,邮箱（每行一个联系人）</li>
              <li><strong>VCF:</strong> vCard标准格式联系人文件</li>
            </ul>
            <p className="mt-2 text-xs text-gray-500">
              示例：张小美,13812345678,北京市朝阳区,时尚博主,zhangxiaomei@example.com
            </p>
          </div>
        </div>
      </div>

      {/* 功能选项卡 */}
      <div className="mb-8">
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('complete-flow')}
            className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'complete-flow'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center">
              <FileDown className="w-4 h-4 mr-1" />
              <span className="mx-1">+</span>
              <Heart className="w-4 h-4 mr-2" />
            </div>
            一键导入+关注
          </button>
          <button
            onClick={() => setActiveTab('vcf-import')}
            className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'vcf-import'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileDown className="w-4 h-4 mr-2" />
            VCF导入
          </button>
          <button
            onClick={() => setActiveTab('auto-follow')}
            className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'auto-follow'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Heart className="w-4 h-4 mr-2" />
            自动关注
          </button>
        </div>
      </div>

      {/* 功能内容区域 */}
      <div className="space-y-6">
        {activeTab === 'complete-flow' && (
          <ImportAndFollow
            selectedDevice={selectedDevice}
            contactsFilePath={contactsFilePath}
            contacts={contacts}
            onComplete={handleCompleteFlowComplete}
            onError={(error: string) => alert('错误: ' + error)}
          />
        )}

        {activeTab === 'vcf-import' && (
          <VcfImporter
            selectedDevice={selectedDevice}
            contacts={contacts}
            onImportComplete={handleVcfImportComplete}
            onError={(error: string) => alert('错误: ' + error)}
          />
        )}

        {activeTab === 'auto-follow' && (
          <XiaohongshuAutoFollow
            selectedDevice={selectedDevice}
            onFollowComplete={handleAutoFollowComplete}
            onError={(error: string) => alert('错误: ' + error)}
          />
        )}
      </div>

      {/* 操作历史和结果 */}
      {Object.keys(results).length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">执行结果</h2>
            <button
              onClick={clearResults}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              清除结果
            </button>
          </div>

          <div className="space-y-4">
            {results.completeFlow && (
              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-700 mb-2">完整流程结果</h3>
                <div className={`text-sm ${results.completeFlow.success ? 'text-green-600' : 'text-red-600'}`}>
                  {results.completeFlow.success ? '✅ 流程执行成功' : '❌ 流程执行失败'}
                  <span className="ml-2 text-gray-500">
                    (耗时: {results.completeFlow.totalDuration}秒)
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-600 space-y-1">
                  <div>导入: {results.completeFlow.importResult.importedContacts}/{results.completeFlow.importResult.totalContacts} 个联系人</div>
                  <div>关注: {results.completeFlow.followResult.totalFollowed} 个用户，{results.completeFlow.followResult.pagesProcessed} 页</div>
                </div>
              </div>
            )}

            {results.vcfImport && !results.completeFlow && (
              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-700 mb-2">VCF导入结果</h3>
                <div className={`text-sm ${results.vcfImport.success ? 'text-green-600' : 'text-red-600'}`}>
                  {results.vcfImport.success ? '✅ 导入成功' : '❌ 导入失败'}
                  <span className="ml-2 text-gray-500">
                    ({results.vcfImport.importedContacts}/{results.vcfImport.totalContacts})
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-600">{results.vcfImport.message}</p>
              </div>
            )}

            {results.autoFollow && !results.completeFlow && (
              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-700 mb-2">自动关注结果</h3>
                <div className={`text-sm ${results.autoFollow.success ? 'text-green-600' : 'text-red-600'}`}>
                  {results.autoFollow.success ? '✅ 关注成功' : '❌ 关注失败'}
                  <span className="ml-2 text-gray-500">
                    ({results.autoFollow.totalFollowed} 个用户)
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-600">{results.autoFollow.message}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 使用说明 */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          使用说明
        </h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p><strong>1. 准备工作：</strong>确保Android设备已连接，小红书App已安装并登录</p>
          <p><strong>2. 联系人文件：</strong>准备CSV格式的联系人文件（姓名,电话,地址,职业,邮箱）</p>
          <p><strong>3. 一键流程：</strong>推荐使用"一键导入+关注"功能，自动完成VCF导入和小红书关注</p>
          <p><strong>4. 分步执行：</strong>也可以分别使用"VCF导入"和"自动关注"功能</p>
          <p><strong>5. 注意事项：</strong>关注操作有间隔限制，建议设置合理的关注间隔避免被限制</p>
        </div>
      </div>
    </div>
  );
};

export default ContactAutomationPage;
