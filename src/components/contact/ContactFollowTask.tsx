import { Activity, CheckCircle, Pause, Play, Smartphone, Target, Users, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Contact, Device, Platform } from '../../types';

// 定义任务状态类型
type TaskStatus = 'idle' | 'running' | 'completed' | 'failed' | 'paused';

// 定义任务日志类型
interface TaskLog {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

// 定义任务进度类型
interface TaskProgress {
  currentContact: number;
  totalContacts: number;
  currentDevice: string;
  successCount: number;
  failureCount: number;
  skippedCount: number;
}

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

  // 新增状态：任务状态、进度、日志
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('idle');
  const [taskProgress, setTaskProgress] = useState<TaskProgress>({
    currentContact: 0,
    totalContacts: 0,
    currentDevice: '',
    successCount: 0,
    failureCount: 0,
    skippedCount: 0
  });
  const [taskLogs, setTaskLogs] = useState<TaskLog[]>([]);

  // 添加日志记录函数
  const addLog = (level: 'info' | 'success' | 'warning' | 'error', message: string, details?: string) => {
    const log: TaskLog = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString('zh-CN'),
      level,
      message,
      details
    };
    setTaskLogs(prev => [log, ...prev].slice(0, 100)); // 保留最近100条日志
  };

  // ADB自动化操作函数
  const executeXiaohongshuFollow = async (phoneNumbers: string[], deviceId: number) => {
    addLog('info', `开始在设备 ${deviceId} 上执行小红书关注任务`);

    try {
      for (let i = 0; i < phoneNumbers.length; i++) {
        const phoneNumber = phoneNumbers[i];

        setTaskProgress(prev => ({
          ...prev,
          currentContact: i + 1,
          totalContacts: phoneNumbers.length,
          currentDevice: `Device-${deviceId}`
        }));

        addLog('info', `正在处理联系人 ${i + 1}/${phoneNumbers.length}: ${phoneNumber}`);

        // 模拟ADB操作步骤
        addLog('info', '查找小红书应用...');
        await new Promise(resolve => setTimeout(resolve, 500));

        addLog('info', '点击搜索按钮...');
        await new Promise(resolve => setTimeout(resolve, 800));

        addLog('info', `输入手机号码: ${phoneNumber}`);
        await new Promise(resolve => setTimeout(resolve, 1000));

        addLog('info', '搜索用户...');
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 模拟搜索结果
        const userFound = Math.random() > 0.2; // 80%概率找到用户
        if (!userFound) {
          addLog('warning', `未找到用户: ${phoneNumber}`);
          setTaskProgress(prev => ({ ...prev, skippedCount: prev.skippedCount + 1 }));
          continue;
        }

        addLog('success', `找到用户: ${phoneNumber}`);

        // 检查是否已关注
        const alreadyFollowed = Math.random() > 0.7; // 30%概率已关注
        if (alreadyFollowed) {
          addLog('info', `用户 ${phoneNumber} 已关注，跳过`);
          setTaskProgress(prev => ({ ...prev, skippedCount: prev.skippedCount + 1 }));
          continue;
        }

        addLog('info', '点击关注按钮...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 模拟关注成功/失败
        const followSuccess = Math.random() > 0.1; // 90%概率关注成功
        if (followSuccess) {
          addLog('success', `成功关注用户: ${phoneNumber}`);
          setTaskProgress(prev => ({ ...prev, successCount: prev.successCount + 1 }));
        } else {
          addLog('error', `关注失败: ${phoneNumber}`);
          setTaskProgress(prev => ({ ...prev, failureCount: prev.failureCount + 1 }));
        }

        // 随机延迟，避免被检测
        const delay = Math.random() * 2000 + 1000; // 1-3秒随机延迟
        addLog('info', `等待 ${Math.round(delay/1000)}秒 避免频率检测...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      addLog('success', `设备 ${deviceId} 关注任务完成！`);
    } catch (error) {
      addLog('error', `设备 ${deviceId} 执行任务时出错: ${error}`);
      throw error;
    }
  };

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
    setTaskStatus('running');

    // 清空之前的日志
    setTaskLogs([]);

    // 初始化进度
    setTaskProgress({
      currentContact: 0,
      totalContacts: selectedContacts.length,
      currentDevice: '',
      successCount: 0,
      failureCount: 0,
      skippedCount: 0
    });

    addLog('info', `开始执行关注任务 - 平台: ${selectedPlatform}, 联系人: ${selectedContacts.length}个, 设备: ${selectedDevices.length}台`);

    try {
      // 获取选中联系人的手机号码
      const selectedContactData = contacts.filter(contact =>
        selectedContacts.includes(contact.id)
      );
      const phoneNumbers = selectedContactData.map(contact =>
        contact.phone || contact.name // 使用手机号码或姓名作为搜索词
      );

      addLog('info', `准备在 ${selectedDevices.length} 台设备上并行执行任务`);

      // 将联系人分配给各个设备
      const contactsPerDevice = Math.ceil(phoneNumbers.length / selectedDevices.length);
      const deviceTasks = selectedDevices.map((deviceId, index) => {
        const startIndex = index * contactsPerDevice;
        const endIndex = Math.min(startIndex + contactsPerDevice, phoneNumbers.length);
        const deviceContacts = phoneNumbers.slice(startIndex, endIndex);

        if (deviceContacts.length > 0) {
          addLog('info', `设备 ${deviceId} 分配到 ${deviceContacts.length} 个联系人`);

          if (selectedPlatform === 'xiaohongshu') {
            return executeXiaohongshuFollow(deviceContacts, deviceId);
          } else {
            addLog('warning', `暂不支持平台: ${selectedPlatform}`);
            return Promise.resolve();
          }
        }
        return Promise.resolve();
      });

      // 等待所有设备完成任务
      await Promise.all(deviceTasks);

      setTaskStatus('completed');
      addLog('success', `所有任务已完成! 成功: ${taskProgress.successCount}, 失败: ${taskProgress.failureCount}, 跳过: ${taskProgress.skippedCount}`);

      // 显示完成对话框
      alert(`关注任务完成！\n成功关注: ${taskProgress.successCount}人\n失败: ${taskProgress.failureCount}人\n跳过: ${taskProgress.skippedCount}人`);

      // 重置表单
      setSelectedContacts([]);
      setSelectedDevices([]);
    } catch (error) {
      console.error('提交关注任务失败:', error);
      setTaskStatus('failed');
      addLog('error', `任务执行失败: ${error}`);
      alert('关注任务执行失败，请查看日志详情');
    } finally {
      setIsSubmitting(false);
    }
  };

  const platforms = [
    { key: 'xiaohongshu', name: '小红书', color: 'bg-red-100 text-red-800' },
    { key: 'douyin', name: '抖音', color: 'bg-blue-100 text-blue-800' },
    { key: 'weibo', name: '微博', color: 'bg-orange-100 text-orange-800' }
  ];

  // 获取任务状态图标和颜色
  const getStatusInfo = () => {
    switch (taskStatus) {
      case 'running':
        return { icon: <Activity className="animate-spin" />, color: 'text-blue-600', text: '运行中' };
      case 'completed':
        return { icon: <CheckCircle />, color: 'text-green-600', text: '已完成' };
      case 'failed':
        return { icon: <XCircle />, color: 'text-red-600', text: '失败' };
      case 'paused':
        return { icon: <Pause />, color: 'text-yellow-600', text: '已暂停' };
      default:
        return { icon: <Target />, color: 'text-gray-600', text: '待开始' };
    }
  };

  return (
    <div className="space-y-6">
      {/* 任务状态显示 */}
      {taskStatus !== 'idle' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">任务状态</h3>
            <div className="flex items-center space-x-2">
              <span className={`${getStatusInfo().color}`}>
                {getStatusInfo().icon}
              </span>
              <span className={`font-medium ${getStatusInfo().color}`}>
                {getStatusInfo().text}
              </span>
            </div>
          </div>

          {/* 进度条 */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>进度: {taskProgress.currentContact}/{taskProgress.totalContacts}</span>
              <span>当前设备: {taskProgress.currentDevice}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${taskProgress.totalContacts > 0 ? (taskProgress.currentContact / taskProgress.totalContacts) * 100 : 0}%`
                }}
              ></div>
            </div>
          </div>

          {/* 统计信息 */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600">{taskProgress.successCount}</div>
              <div className="text-sm text-green-800">成功关注</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-red-600">{taskProgress.failureCount}</div>
              <div className="text-sm text-red-800">关注失败</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-yellow-600">{taskProgress.skippedCount}</div>
              <div className="text-sm text-yellow-800">跳过</div>
            </div>
          </div>
        </div>
      )}

      {/* 任务日志 */}
      {taskLogs.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">任务日志</h3>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {taskLogs.map((log) => (
              <div key={log.id} className="p-3 border-b border-gray-100 last:border-0">
                <div className="flex items-start space-x-3">
                  <span className={`inline-block w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    log.level === 'success' ? 'bg-green-500' :
                    log.level === 'error' ? 'bg-red-500' :
                    log.level === 'warning' ? 'bg-yellow-500' :
                    'bg-blue-500'
                  }`}></span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">{log.timestamp}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        log.level === 'success' ? 'bg-green-100 text-green-800' :
                        log.level === 'error' ? 'bg-red-100 text-red-800' :
                        log.level === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {log.level.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 mt-1">{log.message}</p>
                    {log.details && (
                      <p className="text-xs text-gray-500 mt-1">{log.details}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Users className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">选择联系人</h3>
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                已选择 {selectedContacts.length} / {contacts.length}
              </span>
            </div>
            <button
              onClick={handleSelectAll}
              className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
            >
              {selectedContacts.length === contacts.length ? '取消全选' : '全选'}
            </button>
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="p-4 flex items-center space-x-3 hover:bg-gray-50 cursor-pointer"
              onClick={() => handleContactToggle(contact.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleContactToggle(contact.id);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <input
                type="checkbox"
                checked={selectedContacts.includes(contact.id)}
                onChange={() => {}}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                <p className="text-sm text-gray-500">{contact.phone || contact.email || '无联系方式'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 设备选择 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Smartphone className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">选择设备</h3>
          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
            已选择 {selectedDevices.length} / {devices.length}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((device) => (
            <div
              key={device.id}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedDevices.includes(device.id)
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onClick={() => handleDeviceToggle(device.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleDeviceToggle(device.id);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedDevices.includes(device.id)}
                  onChange={() => {}}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{device.name}</p>
                  <p className="text-xs text-gray-500">{device.phone_name}</p>
                  <span className={`inline-block text-xs px-2 py-1 rounded-full ${
                    device.status === 'connected'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {device.status === 'connected' ? '已连接' : '未连接'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 任务摘要和提交 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Target className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">任务摘要</h3>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between">
            <span className="text-gray-600">选择平台:</span>
            <span className="font-medium">{platforms.find(p => p.key === selectedPlatform)?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">联系人数量:</span>
            <span className="font-medium">{selectedContacts.length} 人</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">设备数量:</span>
            <span className="font-medium">{selectedDevices.length} 台</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">预估费用:</span>
            <span className="font-medium text-indigo-600">￥{estimatedCost.toFixed(2)}</span>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || selectedContacts.length === 0 || selectedDevices.length === 0 || taskStatus === 'running'}
          className={`w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            isSubmitting || selectedContacts.length === 0 || selectedDevices.length === 0 || taskStatus === 'running'
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700'
          } transition-colors`}
        >
          <Play className="h-4 w-4 mr-2" />
          {taskStatus === 'running' ? '任务进行中...' : isSubmitting ? '提交中...' : '开始关注任务'}
        </button>
      </div>
    </div>
  );
};
