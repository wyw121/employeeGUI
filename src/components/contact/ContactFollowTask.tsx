import { Play, Smartphone, Target, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Contact, Device, Platform } from '../../types';

interface ContactFollowTaskProps {
  contacts: Contact[];
}

/**
 * 联系人关注任务组件
 * 基于已导入的联系人列表创建关注任务
 */
export const ContactFollowTask: React.FC<ContactFollowTaskProps> = ({ contacts }) => {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('xiaohongshu');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<number[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 模拟获取已连接设备
  useEffect(() => {
    const mockDevices: Device[] = [
      { id: 1, name: 'Device-01', phone_name: 'Phone-1', status: 'connected' },
      { id: 2, name: 'Device-02', phone_name: 'Phone-2', status: 'connected' },
      { id: 3, name: 'Device-03', phone_name: 'Phone-3', status: 'connected' }
    ];
    setDevices(mockDevices);
  }, []);

  // 计算预估费用
  useEffect(() => {
    const costPerFollow = 0.1; // 每个关注0.1元
    setEstimatedCost(selectedContacts.length * costPerFollow);
  }, [selectedContacts]);

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

  const handleDeviceToggle = (deviceId: number) => {
    setSelectedDevices(prev =>
      prev.includes(deviceId)
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const handleSubmit = async () => {
    if (selectedContacts.length === 0 || selectedDevices.length === 0) {
      alert('请选择联系人和设备');
      return;
    }

    setIsSubmitting(true);
    try {
      // 这里调用后端API开始关注任务
      await new Promise(resolve => setTimeout(resolve, 2000)); // 模拟API调用
      console.log('提交关注任务:', {
        platform: selectedPlatform,
        contacts: selectedContacts,
        devices: selectedDevices,
        estimatedCost
      });

      alert(`成功提交关注任务！\n平台：${selectedPlatform}\n联系人数：${selectedContacts.length}\n设备数：${selectedDevices.length}\n预估费用：￥${estimatedCost.toFixed(2)}`);

      // 重置表单
      setSelectedContacts([]);
      setSelectedDevices([]);
    } catch (error) {
      console.error('提交关注任务失败:', error);
      alert('提交关注任务失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const platforms = [
    { key: 'xiaohongshu', name: '小红书', color: 'bg-red-100 text-red-800' },
    { key: 'douyin', name: '抖音', color: 'bg-blue-100 text-blue-800' },
    { key: 'weibo', name: '微博', color: 'bg-orange-100 text-orange-800' }
  ];

  return (
    <div className="space-y-6">
      {/* 平台选择 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">选择关注平台</h3>
        <div className="flex flex-wrap gap-3">
          {platforms.map((platform) => (
            <button
              key={platform.key}
              onClick={() => setSelectedPlatform(platform.key as Platform)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                selectedPlatform === platform.key
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {platform.name}
            </button>
          ))}
        </div>
      </div>

      {/* 联系人选择 */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">选择要关注的联系人</h3>
          <button
            onClick={handleSelectAll}
            className="text-sm text-indigo-600 hover:text-indigo-500"
          >
            {selectedContacts.length === contacts.length ? '取消全选' : '全选'}
          </button>
        </div>

        <div className="max-h-64 overflow-y-auto">
          {contacts.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p>还没有导入联系人</p>
              <p className="text-sm">请先在"文档管理"中上传通讯录文件</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="p-4 flex items-center space-x-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleContactToggle(contact.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedContacts.includes(contact.id)}
                    onChange={() => handleContactToggle(contact.id)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                      {contact.phone && (
                        <p className="text-sm text-gray-500">{contact.phone}</p>
                      )}
                    </div>
                    {contact.notes && (
                      <p className="text-sm text-gray-500 truncate">{contact.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 设备选择 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">选择执行设备</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {devices.map((device) => (
            <div
              key={device.id}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedDevices.includes(device.id)
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onClick={() => handleDeviceToggle(device.id)}
            >
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={selectedDevices.includes(device.id)}
                  onChange={() => handleDeviceToggle(device.id)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <Smartphone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{device.name}</p>
                  <p className="text-xs text-gray-500">{device.phone_name}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 任务摘要和提交 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">任务摘要</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">选择联系人</p>
              <p className="text-lg text-blue-600">{selectedContacts.length}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">执行设备</p>
              <p className="text-lg text-green-600">{selectedDevices.length}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Play className="w-5 h-5 text-indigo-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">目标平台</p>
              <p className="text-lg text-indigo-600">
                {platforms.find(p => p.key === selectedPlatform)?.name}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 text-orange-500">￥</div>
            <div>
              <p className="text-sm font-medium text-gray-900">预估费用</p>
              <p className="text-lg text-orange-600">￥{estimatedCost.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={selectedContacts.length === 0 || selectedDevices.length === 0 || isSubmitting}
          className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              提交中...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              开始关注任务
            </>
          )}
        </button>
      </div>
    </div>
  );
};
