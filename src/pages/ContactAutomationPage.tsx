import { AlertCircle, FileDown, Heart, Smartphone, Zap } from 'lucide-react';
import React, { useState } from 'react';
import { ImportAndFollow, VcfImporter, XiaohongshuAutoFollow } from '../components/contact';
import { useAdb } from '../application/hooks/useAdb';
import { ImportAndFollowResult, VcfImportResult, XiaohongshuFollowResult } from '../types';

export const ContactAutomationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'vcf-import' | 'auto-follow' | 'complete-flow'>('complete-flow');
  const [selectedDevice, setSelectedDevice] = useState<string>('');
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

  // Sindre风格的功能配置
  const tabOptions = [
    {
      id: 'complete-flow' as const,
      name: 'Complete Flow',
      description: 'Import & Auto-follow',
      icon: Zap,
      gradient: 'var(--gradient-brand)',
      emoji: '⚡'
    },
    {
      id: 'vcf-import' as const,
      name: 'VCF Import',
      description: 'Import contacts only',
      icon: FileDown,
      gradient: 'var(--gradient-cyan)',
      emoji: '📁'
    },
    {
      id: 'auto-follow' as const,
      name: 'Auto Follow',
      description: 'Xiaohongshu batch follow',
      icon: Heart,
      gradient: 'var(--gradient-pink)',
      emoji: '💖'
    }
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Sindre风格页面头部 */}
      <div className="relative p-8 border-b" style={{ borderColor: 'var(--border-primary)' }}>
        {/* 背景装饰 */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-64 h-32 rounded-full blur-3xl"
               style={{ background: 'var(--gradient-pink)' }}></div>
          <div className="absolute top-0 right-0 w-48 h-24 rounded-full blur-3xl"
               style={{ background: 'var(--gradient-cyan)' }}></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl"
                 style={{ background: 'var(--gradient-hero)' }}>
              🚀
            </div>
            <div>
              <h1 className="text-3xl font-bold gradient-hero-text mb-1">
                Contact Automation
              </h1>
              <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
                Import contacts and automate social media interactions
              </p>
            </div>
          </div>

          {/* Sindre风格设备选择器 */}
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                     style={{ background: 'var(--gradient-cyan)' }}>
                  📱
                </div>
                <div>
                  <h3 className="font-semibold gradient-text">Device Management</h3>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Select target device for automation
                  </p>
                </div>
              </div>
              <button
                onClick={refreshDevices}
                className="btn-primary px-4 py-2 text-sm"
                disabled={devicesLoading}
              >
                {devicesLoading ? '🔄' : '🔄'} Refresh
              </button>
            </div>

            {devicesError && (
              <div className="flex items-center space-x-3 p-4 rounded-xl mb-4"
                   style={{ 
                     background: 'rgba(239, 68, 68, 0.1)', 
                     border: '1px solid rgba(239, 68, 68, 0.2)' 
                   }}>
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-red-400 text-sm">{devicesError?.message || 'Unknown error'}</span>
              </div>
            )}

            <div className="grid gap-3">
              {devices.length === 0 ? (
                <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                  <Smartphone className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg font-medium mb-2">No devices connected</p>
                  <p className="text-sm">Connect a device via ADB to get started</p>
                </div>
              ) : (
                devices.map((device) => (
                  <button
                    key={device.id}
                    onClick={() => handleDeviceSelect(device.id)}
                    className={`p-4 rounded-xl text-left transition-all duration-300 transform hover:scale-[1.02] ${
                      selectedDevice === device.id
                        ? 'glass-card border'
                        : 'hover:bg-white/5'
                    }`}
                    style={{
                      background: selectedDevice === device.id ? 'var(--glass-bg)' : 'transparent',
                      borderColor: selectedDevice === device.id ? 'var(--glass-border)' : 'transparent'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                          device.status === 'online' ? 'animate-pulse' : ''
                        }`}
                             style={{ 
                               background: device.status === 'online' 
                                 ? 'var(--gradient-green)' 
                                 : 'var(--bg-tertiary)' 
                             }}>
                          {device.status === 'online' ? '📱' : '📴'}
                        </div>
                        <div>
                          <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                            {device.name}
                          </div>
                          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {device.id} • {device.status}
                          </div>
                        </div>
                      </div>
                      {selectedDevice === device.id && (
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                             style={{ background: 'var(--gradient-brand)' }}>
                          ✓
                        </div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sindre风格功能标签页 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="flex space-x-4">
            {tabOptions.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex-1 p-6 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] group ${
                    isActive ? 'glass-card border' : 'hover:bg-white/5'
                  }`}
                  style={{
                    background: isActive ? 'var(--glass-bg)' : 'transparent',
                    borderColor: isActive ? 'var(--glass-border)' : 'transparent'
                  }}
                >
                  {/* 背景渐变装饰 */}
                  {isActive && (
                    <div className="absolute inset-0 opacity-10 rounded-2xl"
                         style={{ background: tab.gradient }}></div>
                  )}

                  <div className="relative z-10 text-center">
                    <div className="flex items-center justify-center mb-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl mr-3"
                           style={{ background: tab.gradient }}>
                        {tab.emoji}
                      </div>
                      <IconComponent className={`w-6 h-6 ${
                        isActive ? 'text-white' : 'text-gray-400'
                      }`} />
                    </div>
                    <h3 className={`font-bold text-lg mb-2 ${
                      isActive ? 'gradient-text' : 'text-gray-300'
                    }`}>
                      {tab.name}
                    </h3>
                    <p className={`text-sm ${
                      isActive ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {tab.description}
                    </p>
                  </div>

                  {/* 激活状态指示器 */}
                  {isActive && (
                    <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 w-2 h-2 rounded-full animate-pulse"
                         style={{ background: tab.gradient }}></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 主要内容区域 */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="h-full glass-card rounded-2xl p-6">
            {!selectedDevice ? (
              <div className="h-full flex items-center justify-center text-center">
                <div style={{ color: 'var(--text-secondary)' }}>
                  <Smartphone className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">Select a Device</h3>
                  <p className="text-lg">Choose a connected device to start automation</p>
                </div>
              </div>
            ) : (
              <div className="h-full">
                {activeTab === 'complete-flow' && (
                  <ImportAndFollow
                    selectedDevice={selectedDevice}
                    onComplete={(result) => setResults(prev => ({ ...prev, completeFlow: result }))}
                  />
                )}
                {activeTab === 'vcf-import' && (
                  <VcfImporter
                    selectedDevice={selectedDevice}
                    contacts={[]}
                    onImportComplete={(result) => setResults(prev => ({ ...prev, vcfImport: result }))}
                  />
                )}
                {activeTab === 'auto-follow' && (
                  <XiaohongshuAutoFollow
                    selectedDevice={selectedDevice}
                    onWorkflowComplete={(result) => setResults(prev => ({ ...prev, autoFollow: result }))}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sindre风格结果展示区域（如果有结果） */}
      {Object.keys(results).length > 0 && (
        <div className="p-6 border-t" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                   style={{ background: 'var(--gradient-green)' }}>
                📊
              </div>
              <h3 className="font-semibold gradient-text">Automation Results</h3>
            </div>
            
            <div className="grid gap-4 md:grid-cols-3">
              {results.completeFlow && (
                <div className="p-4 rounded-xl" 
                     style={{ background: 'var(--bg-secondary)' }}>
                  <div className="flex items-center space-x-2 mb-2">
                    <Zap className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      Complete Flow
                    </span>
                  </div>
                  <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Contacts: {results.completeFlow.importResult.importedContacts}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Followed: {results.completeFlow.followResult.totalFollowed}
                  </p>
                </div>
              )}
              
              {results.vcfImport && (
                <div className="p-4 rounded-xl" 
                     style={{ background: 'var(--bg-secondary)' }}>
                  <div className="flex items-center space-x-2 mb-2">
                    <FileDown className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      VCF Import
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {results.vcfImport.importedContacts} contacts imported
                  </p>
                </div>
              )}
              
              {results.autoFollow && (
                <div className="p-4 rounded-xl" 
                     style={{ background: 'var(--bg-secondary)' }}>
                  <div className="flex items-center space-x-2 mb-2">
                    <Heart className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      Auto Follow
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {results.autoFollow.totalFollowed} users followed
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

