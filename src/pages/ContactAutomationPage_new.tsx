import { AlertCircle, BarChart3, CheckCircle, FileDown, Heart, RefreshCw, Smartphone, Sparkles, Target, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { ImportAndFollow, VcfImporter, XiaohongshuAutoFollow } from '../components/contact';
import { useAdb } from '../application/hooks/useAdb';
import { Contact, ImportAndFollowResult, VcfImportResult, XiaohongshuFollowResult } from '../types';

export const ContactAutomationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'vcf-import' | 'auto-follow' | 'complete-flow'>('complete-flow');
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [contacts] = useState<Contact[]>([]);
  const [results, setResults] = useState<{
    vcfImport?: VcfImportResult;
    autoFollow?: XiaohongshuFollowResult;
    completeFlow?: ImportAndFollowResult;
  }>({});

  const { devices, isLoading: devicesLoading, lastError: devicesError, refreshDevices } = useAdb();

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
        <div className="flex items-center justify-center p-6 bg-white/80 rounded-2xl shadow-lg border border-gray-200/50">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center animate-pulse shadow-lg">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-gray-900 font-bold text-lg">正在检测设备</div>
              <div className="text-gray-500 text-sm">扫描可用的ADB设备...</div>
            </div>
          </div>
        </div>
      );
    }

    if (devicesError) {
      return (
        <div className="flex items-center justify-center p-6 bg-gradient-to-br from-red-50 to-pink-50 border border-red-200/50 rounded-2xl shadow-lg">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-red-800 font-bold text-lg">设备连接失败</div>
              <div className="text-red-600 text-sm">{devicesError?.message || 'Unknown error'}</div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-gray-900">
                可用设备 ({devices.length} 个)
              </span>
              <p className="text-gray-600 text-sm">选择要使用的设备进行自动化操作</p>
            </div>
          </div>
          <button
            onClick={refreshDevices}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            <span>刷新设备</span>
          </button>
        </div>

        {devices.length === 0 ? (
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200/60 rounded-2xl p-8 text-center shadow-lg">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-yellow-800 mb-2">未检测到设备</h3>
            <p className="text-yellow-700 mb-4">请确保以下条件满足:</p>
            <div className="bg-white/60 rounded-xl p-4 text-left max-w-md mx-auto">
              <ul className="text-sm text-yellow-800 space-y-2">
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>雷电模拟器正在运行</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>ADB调试服务已启用</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>设备连接正常</span>
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map((device) => (
              <button
                key={device.id}
                onClick={() => handleDeviceSelect(device.id)}
                className={`group p-4 rounded-2xl cursor-pointer transition-all duration-300 text-left w-full transform hover:scale-[1.02] ${
                  selectedDevice === device.id
                    ? 'bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-500 shadow-lg shadow-blue-500/20'
                    : 'bg-white/80 border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg hover:bg-white'
                }`}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                    selectedDevice === device.id
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600'
                  }`}>
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-gray-800">{device.id}</span>
                </div>
                {selectedDevice === device.id && (
                  <div className="flex items-center space-x-2 mt-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700 font-medium">已选中使用</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
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
  }, [refreshDevices]);

  return (
    <div className="h-full p-6">
      {/* 现代化页面头部 */}
      <div className="mb-8">
        <div className="flex items-start space-x-4 mb-6">
          <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl shadow-xl">
            <Target className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-gray-900 via-purple-800 to-pink-700 bg-clip-text text-transparent">
              通讯录自动化中心
            </h1>
            <p className="text-gray-600 max-w-4xl leading-relaxed text-lg">
              集成 Flow_Farm 项目的 VCF 通讯录导入和小红书自动关注功能，实现一站式联系人管理和社交媒体自动化获客
            </p>
          </div>
        </div>

        {/* 功能特性卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="group bg-gradient-to-br from-blue-50 via-blue-50 to-indigo-100 p-6 rounded-2xl border border-blue-200/50 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-blue-500/30 transition-shadow">
                <FileDown className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-blue-900 text-lg">VCF 导入</span>
            </div>
            <p className="text-blue-700">支持标准 VCF 格式通讯录文件批量导入，快速整理联系人数据</p>
          </div>
          <div className="group bg-gradient-to-br from-pink-50 via-pink-50 to-rose-100 p-6 rounded-2xl border border-pink-200/50 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-pink-500/30 transition-shadow">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-pink-900 text-lg">自动关注</span>
            </div>
            <p className="text-pink-700">小红书平台智能批量关注，高效提升社交媒体获客能力</p>
          </div>
          <div className="group bg-gradient-to-br from-emerald-50 via-emerald-50 to-green-100 p-6 rounded-2xl border border-emerald-200/50 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-emerald-500/30 transition-shadow">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-emerald-900 text-lg">一键执行</span>
            </div>
            <p className="text-emerald-700">导入联系人并自动执行关注，全流程自动化无需人工干预</p>
          </div>
        </div>
      </div>

      {/* 设备选择区域 - 现代化设计 */}
      <div className="mb-8">
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/50 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500/10 via-green-500/10 to-teal-500/10 p-8 border-b border-gray-200/50">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl shadow-xl">
                <Smartphone className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">设备管理中心</h2>
                <p className="text-gray-600">管理和控制您的 ADB 连接设备</p>
              </div>
            </div>
          </div>
          <div className="p-8">
            {renderDeviceStatus()}
          </div>
        </div>
      </div>

      {/* 功能选项卡 - 现代化设计 */}
      <div className="mb-8">
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/50 overflow-hidden">
          <div className="p-8 border-b border-gray-200/50">
            <div className="flex items-center space-x-4 mb-8">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-xl">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">自动化操作</h2>
                <p className="text-gray-600">选择您需要的功能模块</p>
              </div>
            </div>

            {/* Tab 导航 */}
            <div className="flex flex-wrap gap-4">
              {tabOptions.map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-4 px-8 py-5 rounded-2xl font-bold transition-all duration-300 transform hover:scale-[1.02] ${
                      isActive
                        ? `bg-gradient-to-r ${tab.gradient} text-white shadow-2xl shadow-${tab.gradient.split('-')[1]}-500/30`
                        : `${tab.bgColor} ${tab.textColor} hover:shadow-xl`
                    }`}
                  >
                    <IconComponent className="w-6 h-6" />
                    <div className="text-left">
                      <div className="font-bold">{tab.name}</div>
                      <div className={`text-sm opacity-80 ${isActive ? 'text-white/80' : ''}`}>
                        {tab.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab 内容区域 */}
          <div className="p-8 bg-gradient-to-br from-gray-50/50 to-white/50">
            {selectedDevice ? (
              <div className="space-y-8">
                {/* 选中设备信息 */}
                <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200/50 shadow-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <Smartphone className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <span className="font-bold text-blue-900 text-lg">当前选中设备</span>
                      <p className="text-blue-700">{selectedDevice}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-green-700 font-bold">已连接</span>
                  </div>
                </div>

                {/* 功能组件渲染 */}
                <div className="bg-white/80 rounded-3xl p-8 shadow-2xl border border-gray-200/50">
                  {activeTab === 'vcf-import' && (
                    <VcfImporter
                      selectedDevice={selectedDevice}
                      contacts={contacts}
                      onImportComplete={handleVcfImportComplete}
                    />
                  )}
                  {activeTab === 'auto-follow' && (
                    <XiaohongshuAutoFollow
                      selectedDevice={selectedDevice}
                      onWorkflowComplete={handleAutoFollowComplete}
                    />
                  )}
                  {activeTab === 'complete-flow' && (
                    <ImportAndFollow
                      selectedDevice={selectedDevice}
                      onComplete={handleCompleteFlowComplete}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-32 h-32 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Smartphone className="w-16 h-16 text-gray-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-700 mb-3">请选择设备</h3>
                <p className="text-gray-500 max-w-md mx-auto text-lg">
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
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/50 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 p-8 border-b border-gray-200/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl">
                    <BarChart3 className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">执行结果</h2>
                    <p className="text-gray-600">查看自动化操作的执行情况</p>
                  </div>
                </div>
                <button
                  onClick={clearResults}
                  className="px-6 py-3 text-sm font-bold text-red-600 hover:text-red-800 hover:bg-red-50 rounded-xl transition-colors shadow-lg hover:shadow-xl"
                >
                  清除结果
                </button>
              </div>
            </div>
            <div className="p-8 space-y-6">
              {results.vcfImport && (
                <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200/50 shadow-lg">
                  <h3 className="font-bold text-blue-900 mb-3 flex items-center text-lg">
                    <FileDown className="w-5 h-5 mr-3" />
                    VCF 导入结果
                  </h3>
                  <div className="text-blue-800 space-y-2">
                    <p><span className="font-semibold">成功导入:</span> {results.vcfImport.importedContacts} 个联系人</p>
                    <p><span className="font-semibold">状态:</span> {results.vcfImport.success ? '成功' : '失败'}</p>
                    {results.vcfImport.message && <p><span className="font-semibold">详情:</span> {results.vcfImport.message}</p>}
                  </div>
                </div>
              )}

              {results.autoFollow && (
                <div className="p-6 bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl border border-pink-200/50 shadow-lg">
                  <h3 className="font-bold text-pink-900 mb-3 flex items-center text-lg">
                    <Heart className="w-5 h-5 mr-3" />
                    自动关注结果
                  </h3>
                  <div className="text-pink-800 space-y-2">
                    <p><span className="font-semibold">成功关注:</span> {results.autoFollow.totalFollowed} 个用户</p>
                    <p><span className="font-semibold">处理页面:</span> {results.autoFollow.pagesProcessed} 页</p>
                    <p><span className="font-semibold">状态:</span> {results.autoFollow.success ? '完成' : '部分失败'}</p>
                    {results.autoFollow.message && <p><span className="font-semibold">详情:</span> {results.autoFollow.message}</p>}
                  </div>
                </div>
              )}

              {results.completeFlow && (
                <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-200/50 shadow-lg">
                  <h3 className="font-bold text-purple-900 mb-3 flex items-center text-lg">
                    <Zap className="w-5 h-5 mr-3" />
                    完整流程结果
                  </h3>
                  <div className="text-purple-800 space-y-2">
                    <p><span className="font-semibold">导入联系人:</span> {results.completeFlow.importResult?.importedContacts || 0} 个</p>
                    <p><span className="font-semibold">成功关注:</span> {results.completeFlow.followResult?.totalFollowed || 0} 个</p>
                    <p><span className="font-semibold">总时长:</span> {results.completeFlow.totalDuration || 0} 秒</p>
                    <p><span className="font-semibold">状态:</span> {results.completeFlow.success ? '全部完成' : '部分完成'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

