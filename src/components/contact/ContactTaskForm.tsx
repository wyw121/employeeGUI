import React, { useState } from 'react';
import { Play, Settings, Smartphone } from 'lucide-react';
import { Contact, ContactTask, ContactTaskSettings, Platform, TaskStatus } from '../../types';

interface ContactTaskFormProps {
  contacts: Contact[];
  onTaskCreate: (task: ContactTask) => void;
}

export const ContactTaskForm: React.FC<ContactTaskFormProps> = ({
  contacts,
  onTaskCreate
}) => {
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('wechat');
  const [settings, setSettings] = useState<ContactTaskSettings>({
    batchSize: 10,
    intervalSeconds: 30,
    message: '您好，很高兴认识您！',
    autoReply: false,
    skipExisting: true,
    maxRetries: 3
  });

  // 模拟可用设备列表
  const availableDevices = [
    { id: '1', name: '设备1', status: 'connected' },
    { id: '2', name: '设备2', status: 'connected' },
    { id: '3', name: '设备3', status: 'disconnected' }
  ];

  const platforms: { value: Platform; label: string; icon: string }[] = [
    { value: 'wechat', label: '微信', icon: '💬' },
    { value: 'qq', label: 'QQ', icon: '🐧' },
    { value: 'xiaohongshu', label: '小红书', icon: '📕' },
    { value: 'douyin', label: '抖音', icon: '🎵' },
    { value: 'weibo', label: '微博', icon: '📰' }
  ];

  const handleContactToggle = (contactId: string) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleSelectAll = () => {
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(contacts.map(c => c.id));
    }
  };

  const handleCreateTask = () => {
    if (selectedContacts.length === 0 || !selectedDevice) {
      return;
    }

    const selectedContactsData = contacts.filter(c => selectedContacts.includes(c.id));
    
    const newTask: ContactTask = {
      id: Date.now().toString(),
      documentId: 'current-selection',
      deviceId: selectedDevice,
      platform: selectedPlatform,
      contacts: selectedContactsData,
      status: 'pending' as TaskStatus,
      progress: {
        total: selectedContactsData.length,
        completed: 0,
        failed: 0,
        percentage: 0
      },
      settings,
      createdAt: new Date()
    };

    onTaskCreate(newTask);
    
    // 重置表单
    setSelectedContacts([]);
    setSelectedDevice('');
  };

  return (
    <div className="space-y-6">
      {/* 联系人选择 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">
            选择联系人 ({selectedContacts.length}/{contacts.length})
          </label>
          <button
            onClick={handleSelectAll}
            className="text-sm text-indigo-600 hover:text-indigo-500"
          >
            {selectedContacts.length === contacts.length ? '取消全选' : '全选'}
          </button>
        </div>
        
        <div className="border border-gray-200 rounded-md max-h-48 overflow-y-auto">
          {contacts.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              暂无可选择的联系人
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {contacts.map((contact) => (
                <label
                  key={contact.id}
                  className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedContacts.includes(contact.id)}
                    onChange={() => handleContactToggle(contact.id)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-3"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {contact.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {contact.phone || contact.wechat || contact.qq}
                    </div>
                  </div>
                  {contact.tags && contact.tags.length > 0 && (
                    <div className="flex space-x-1">
                      {contact.tags.slice(0, 2).map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 平台选择 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          选择平台
        </label>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {platforms.map((platform) => (
            <button
              key={platform.value}
              onClick={() => setSelectedPlatform(platform.value)}
              className={`flex items-center justify-center px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                selectedPlatform === platform.value
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="mr-1">{platform.icon}</span>
              {platform.label}
            </button>
          ))}
        </div>
      </div>

      {/* 设备选择 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          选择设备
        </label>
        <select
          value={selectedDevice}
          onChange={(e) => setSelectedDevice(e.target.value)}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">请选择设备</option>
          {availableDevices.map((device) => (
            <option
              key={device.id}
              value={device.id}
              disabled={device.status !== 'connected'}
            >
              <Smartphone className="w-4 h-4 mr-2" />
              {device.name} - {device.status === 'connected' ? '已连接' : '未连接'}
            </option>
          ))}
        </select>
      </div>

      {/* 高级设置 */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center mb-3">
          <Settings className="w-5 h-5 text-gray-400 mr-2" />
          <h4 className="text-sm font-medium text-gray-900">任务设置</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              批处理数量
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={settings.batchSize}
              onChange={(e) => setSettings(prev => ({ ...prev, batchSize: parseInt(e.target.value) || 1 }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              联系间隔 (秒)
            </label>
            <input
              type="number"
              min="10"
              max="300"
              value={settings.intervalSeconds}
              onChange={(e) => setSettings(prev => ({ ...prev, intervalSeconds: parseInt(e.target.value) || 10 }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              联系消息模板
            </label>
            <textarea
              value={settings.message}
              onChange={(e) => setSettings(prev => ({ ...prev, message: e.target.value }))}
              placeholder="输入要发送的消息模板"
              rows={3}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div className="md:col-span-2 space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.skipExisting}
                onChange={(e) => setSettings(prev => ({ ...prev, skipExisting: e.target.checked }))}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-2"
              />
              <span className="text-sm text-gray-700">跳过已联系的用户</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.autoReply}
                onChange={(e) => setSettings(prev => ({ ...prev, autoReply: e.target.checked }))}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-2"
              />
              <span className="text-sm text-gray-700">启用自动回复</span>
            </label>
          </div>
        </div>
      </div>

      {/* 创建任务按钮 */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={() => {
            setSelectedContacts([]);
            setSelectedDevice('');
          }}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          重置
        </button>
        <button
          onClick={handleCreateTask}
          disabled={selectedContacts.length === 0 || !selectedDevice}
          className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
        >
          <Play className="w-4 h-4 mr-2" />
          创建联系任务 ({selectedContacts.length})
        </button>
      </div>
    </div>
  );
};
