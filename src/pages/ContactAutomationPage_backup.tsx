import { AlertCircle, CheckCircle, FileDown, Heart, Smartphone, Users, Sparkles, Zap, Target, BarChart3 } from 'lucide-react';
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

  // Tab选项配置
  const tabOptions = [
    {
      id: 'complete-flow' as const,
      name: '一键流程',
      description: '导入通讯录并自动关注',
      icon: Zap,
      gradient: 'from-purple-500 to-pink-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700'
    },
    {
      id: 'vcf-import' as const,
      name: 'VCF导入',
      description: '仅导入通讯录文件',
      icon: FileDown,
      gradient: 'from-blue-500 to-indigo-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    {
      id: 'auto-follow' as const,
      name: '自动关注',
      description: '小红书批量关注',
      icon: Heart,
      gradient: 'from-pink-500 to-rose-600',
      bgColor: 'bg-pink-50',
      textColor: 'text-pink-700'
    }
  ];

  // 设备状态显示组件 - 现代化版本
  const renderDeviceStatus = () => {
    if (devicesLoading) {
      return (
        <div className="flex items-center justify-center p-6 bg-white rounded-xl shadow-sm border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center animate-pulse">
              <Smartphone className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-gray-900 font-semibold">正在检测设备</div>
              <div className="text-gray-500 text-sm">扫描可用的ADB设备...</div>
            </div>
          </div>
        </div>
      );
    }

    if (devicesError) {
      return (
        <div className="flex items-center justify-center p-6 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-red-800 font-semibold">设备连接失败</div>
              <div className="text-red-600 text-sm">{devicesError}</div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-semibold text-gray-900">
                可用设备 ({devices.length} 个)
              </span>
              <p className="text-gray-500 text-sm">选择要使用的设备进行自动化操作</p>
            </div>
          </div>
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
    <div className="h-full p-6">
      {/* 现代化页面头部 */}
      <div className="mb-8">
        <div className="flex items-start space-x-4 mb-4">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-lg">
            <Target className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 bg-gradient-to-r from-gray-900 via-purple-800 to-pink-700 bg-clip-text text-transparent">
              通讯录自动化中心
            </h1>
            <p className="text-gray-600 max-w-3xl leading-relaxed">
              集成 Flow_Farm 项目的 VCF 通讯录导入和小红书自动关注功能，实现一站式联系人管理和社交媒体自动化获客
            </p>
          </div>
        </div>

        {/* 功能特性卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-4 rounded-xl border border-blue-200/50">
            <div className="flex items-center space-x-3 mb-2">
              <FileDown className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-900">VCF 导入</span>
            </div>
            <p className="text-blue-700 text-sm">支持标准 VCF 格式通讯录文件批量导入</p>
          </div>
          <div className="bg-gradient-to-br from-pink-50 to-rose-100 p-4 rounded-xl border border-pink-200/50">
            <div className="flex items-center space-x-3 mb-2">
              <Heart className="w-5 h-5 text-pink-600" />
              <span className="font-semibold text-pink-900">自动关注</span>
            </div>
            <p className="text-pink-700 text-sm">小红书平台智能批量关注，提升获客效率</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-green-100 p-4 rounded-xl border border-emerald-200/50">
            <div className="flex items-center space-x-3 mb-2">
              <Zap className="w-5 h-5 text-emerald-600" />
              <span className="font-semibold text-emerald-900">一键执行</span>
            </div>
            <p className="text-emerald-700 text-sm">导入联系人并自动执行关注，全流程自动化</p>
          </div>
        </div>
      </div>

      {/* 设备选择区域 - 现代化设计 */}
      <div className="mb-8">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500/10 via-green-500/10 to-teal-500/10 p-6 border-b border-gray-200/50">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">设备管理中心</h2>
                <p className="text-gray-600 text-sm">管理和控制您的 ADB 连接设备</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {renderDeviceStatus()}
          </div>
        </div>
      </div>

      {/* 功能选项卡 - 现代化设计 */}
      <div className="mb-8">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 overflow-hidden">
          <div className="p-6 border-b border-gray-200/50">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">自动化操作</h2>
                <p className="text-gray-600 text-sm">选择您需要的功能模块</p>
              </div>
            </div>

            {/* Tab 导航 */}
            <div className="flex flex-wrap gap-3">
              {tabOptions.map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-3 px-6 py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-[1.02] ${
                      isActive
                        ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg shadow-${tab.gradient.split('-')[1]}-500/25`
                        : `${tab.bgColor} ${tab.textColor} hover:shadow-md`
                    }`}
                  >
                    <IconComponent className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-bold text-sm">{tab.name}</div>
                      <div className={`text-xs opacity-80 ${isActive ? 'text-white/80' : ''}`}>
                        {tab.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab 内容区域 */}
          <div className="p-6 bg-gradient-to-br from-gray-50/50 to-white/50">
            {selectedDevice ? (
              <div className="space-y-6">
                {/* 选中设备信息 */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/50">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                      <Smartphone className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <span className="font-semibold text-blue-900">当前选中设备</span>
                      <p className="text-blue-700 text-sm">{selectedDevice}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-green-700 text-sm font-medium">已连接</span>
                  </div>
                </div>

                {/* 功能组件渲染 */}
                <div className="bg-white/80 rounded-2xl p-6 shadow-lg border border-gray-200/50">
                  {activeTab === 'vcf-import' && (
                    <VcfImporter
                      deviceId={selectedDevice}
                      onComplete={handleVcfImportComplete}
                    />
                  )}
                  {activeTab === 'auto-follow' && (
                    <XiaohongshuAutoFollow
                      deviceId={selectedDevice}
                      contacts={contacts}
                      onComplete={handleAutoFollowComplete}
                    />
                  )}
                  {activeTab === 'complete-flow' && (
                    <ImportAndFollow
                      deviceId={selectedDevice}
                      onComplete={handleCompleteFlowComplete}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="w-12 h-12 text-gray-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">请选择设备</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  请先从上方设备列表中选择一个设备，然后开始进行自动化操作
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 结果显示区域 - 现代化设计 */}
      {(results.vcfImport || results.autoFollow || results.completeFlow) && (
        <div className="mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 p-6 border-b border-gray-200/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">执行结果</h2>
                    <p className="text-gray-600 text-sm">查看自动化操作的执行情况</p>
                  </div>
                </div>
                <button
                  onClick={clearResults}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                >
                  清除结果
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {results.vcfImport && (
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200/50">
                  <h3 className="font-bold text-blue-900 mb-2 flex items-center">
                    <FileDown className="w-4 h-4 mr-2" />
                    VCF 导入结果
                  </h3>
                  <div className="text-blue-800 text-sm space-y-1">
                    <p>成功导入: {results.vcfImport.importedCount} 个联系人</p>
                    <p>状态: {results.vcfImport.success ? '成功' : '失败'}</p>
                    {results.vcfImport.message && <p>详情: {results.vcfImport.message}</p>}
                  </div>
                </div>
              )}

              {results.autoFollow && (
                <div className="p-4 bg-pink-50 rounded-xl border border-pink-200/50">
                  <h3 className="font-bold text-pink-900 mb-2 flex items-center">
                    <Heart className="w-4 h-4 mr-2" />
                    自动关注结果
                  </h3>
                  <div className="text-pink-800 text-sm space-y-1">
                    <p>成功关注: {results.autoFollow.successCount} 个用户</p>
                    <p>失败关注: {results.autoFollow.failureCount} 个用户</p>
                    <p>状态: {results.autoFollow.success ? '完成' : '部分失败'}</p>
                    {results.autoFollow.message && <p>详情: {results.autoFollow.message}</p>}
                  </div>
                </div>
              )}

              {results.completeFlow && (
                <div className="p-4 bg-purple-50 rounded-xl border border-purple-200/50">
                  <h3 className="font-bold text-purple-900 mb-2 flex items-center">
                    <Zap className="w-4 h-4 mr-2" />
                    完整流程结果
                  </h3>
                  <div className="text-purple-800 text-sm space-y-1">
                    <p>导入联系人: {results.completeFlow.vcfImport?.importedCount || 0} 个</p>
                    <p>成功关注: {results.completeFlow.autoFollow?.successCount || 0} 个</p>
                    <p>状态: {results.completeFlow.success ? '全部完成' : '部分完成'}</p>
                    {results.completeFlow.message && <p>详情: {results.completeFlow.message}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
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
