import { Activity, CheckCircle, Pause, Play, Smartphone, Target, Users, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAdb } from '../../application/hooks/useAdb';
import { Device } from '../../domain/adb/entities/Device';

// 定义平台类型
type Platform = 'xiaohongshu' | 'wechat' | 'qq';

// 定义联系人类型
interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

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
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
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

  // 使用统一的ADB接口 - 遵循DDD架构约束
  const { 
    devices, 
    selectedDevice, 
    selectDevice, 
    isLoading,
    refreshDevices,
    initialize,
    onlineDevices
  } = useAdb();

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
  const executeXiaohongshuFollow = async (phoneNumbers: string[], deviceId: string) => {
    addLog('info', `开始在设备 ${deviceId} 上执行小红书关注任务`);

    try {
      for (let i = 0; i < phoneNumbers.length; i++) {
        const phoneNumber = phoneNumbers[i];

        setTaskProgress(prev => ({
          ...prev,
          currentContact: i + 1,
          totalContacts: phoneNumbers.length,
          currentDevice: deviceId
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

        addLog('info', '点击关注按钮...');
        await new Promise(resolve => setTimeout(resolve, 800));

        // 模拟关注结果
        const followSuccess = Math.random() > 0.1; // 90%成功率
        if (followSuccess) {
          addLog('success', `成功关注用户: ${phoneNumber}`);
          setTaskProgress(prev => ({ ...prev, successCount: prev.successCount + 1 }));
        } else {
          addLog('error', `关注失败: ${phoneNumber}`, '可能已经关注过或网络问题');
          setTaskProgress(prev => ({ ...prev, failureCount: prev.failureCount + 1 }));
        }

        // 关注间隔
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      addLog('error', '执行关注任务时发生错误', String(error));
      throw error;
    }
  };

  // 初始化ADB环境
  useEffect(() => {
    const initializeAdb = async () => {
      try {
        await initialize();
        await refreshDevices();
      } catch (error) {
        console.error('ADB初始化失败:', error);
        addLog('error', 'ADB初始化失败', String(error));
      }
    };

    initializeAdb();
  }, [initialize, refreshDevices]);

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

  const handleDeviceToggle = (deviceId: string) => {
    setSelectedDevices(prev =>
      prev.includes(deviceId)
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  // 提交任务
  const handleSubmit = async () => {
    if (selectedContacts.length === 0 || selectedDevices.length === 0) {
      addLog('warning', '请选择联系人和设备');
      return;
    }

    setIsSubmitting(true);
    setTaskStatus('running');
    addLog('info', '开始执行关注任务');

    try {
      // 将联系人分配给设备
      const contactsPerDevice = Math.ceil(selectedContacts.length / selectedDevices.length);
      const promises: Promise<void>[] = [];

      selectedDevices.forEach((deviceId, index) => {
        const startIndex = index * contactsPerDevice;
        const endIndex = Math.min(startIndex + contactsPerDevice, selectedContacts.length);
        const deviceContacts = selectedContacts.slice(startIndex, endIndex)
          .map(contactId => contacts.find(c => c.id === contactId)?.phone)
          .filter(phone => phone) as string[];

        if (deviceContacts.length > 0) {
          const promise = executeXiaohongshuFollow(deviceContacts, deviceId);
          promises.push(promise);
        }
      });

      await Promise.all(promises);
      setTaskStatus('completed');
      addLog('success', `任务完成！成功: ${taskProgress.successCount}, 失败: ${taskProgress.failureCount}, 跳过: ${taskProgress.skippedCount}`);
    } catch (error) {
      setTaskStatus('failed');
      addLog('error', '任务执行失败', String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 暂停/恢复任务
  const handlePauseResume = () => {
    if (taskStatus === 'running') {
      setTaskStatus('paused');
      addLog('info', '任务已暂停');
    } else if (taskStatus === 'paused') {
      setTaskStatus('running');
      addLog('info', '任务已恢复');
    }
  };

  // 获取状态图标和颜色
  const getStatusDisplay = (status: TaskStatus) => {
    switch (status) {
      case 'idle':
        return { icon: Target, color: 'text-gray-500', text: '待开始' };
      case 'running':
        return { icon: Play, color: 'text-blue-500', text: '运行中' };
      case 'completed':
        return { icon: CheckCircle, color: 'text-green-500', text: '已完成' };
      case 'failed':
        return { icon: XCircle, color: 'text-red-500', text: '失败' };
      case 'paused':
        return { icon: Pause, color: 'text-yellow-500', text: '已暂停' };
      default:
        return { icon: Target, color: 'text-gray-500', text: '未知' };
    }
  };

  const statusDisplay = getStatusDisplay(taskStatus);
  const StatusIcon = statusDisplay.icon;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* 头部 */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">联系人关注任务</h1>
                <p className="text-sm text-gray-600">基于已导入的联系人创建自动关注任务</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <StatusIcon className={`h-5 w-5 ${statusDisplay.color}`} />
              <span className={`text-sm font-medium ${statusDisplay.color}`}>
                {statusDisplay.text}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          {/* 左侧：任务配置 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 平台选择 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">选择平台</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'xiaohongshu', name: '小红书', icon: '📱' },
                  { id: 'wechat', name: '微信', icon: '💬' },
                  { id: 'qq', name: 'QQ', icon: '🐧' }
                ].map((platform) => (
                  <button
                    key={platform.id}
                    className={`p-3 rounded-lg border text-center transition-colors ${
                      selectedPlatform === platform.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedPlatform(platform.id as Platform)}
                  >
                    <div className="text-2xl mb-1">{platform.icon}</div>
                    <div className="text-sm font-medium">{platform.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 联系人选择 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">选择联系人</h3>
                <span className="text-sm text-gray-600">
                  已选择 {selectedContacts.length} / {contacts.length}
                </span>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <div className="grid grid-cols-1 gap-2">
                  {contacts.map((contact) => (
                    <label
                      key={contact.id}
                      className="flex items-center p-3 rounded-lg border border-gray-200 bg-white cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                        checked={selectedContacts.includes(contact.id)}
                        onChange={() => handleContactToggle(contact.id)}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{contact.name}</div>
                        <div className="text-sm text-gray-600">{contact.phone}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* 设备选择 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">选择设备</h3>
                <button
                  onClick={refreshDevices}
                  disabled={isLoading}
                  className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                >
                  刷新设备
                </button>
              </div>
              {onlineDevices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Smartphone className="h-12 w-12 mx-auto mb-2" />
                  <p>未检测到在线设备</p>
                  <p className="text-sm">请确保设备已连接并启用USB调试</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {onlineDevices.map((device) => (
                    <label
                      key={device.id}
                      className="flex items-center p-3 rounded-lg border border-gray-200 bg-white cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                        checked={selectedDevices.includes(device.id)}
                        onChange={() => handleDeviceToggle(device.id)}
                      />
                      <Smartphone className="h-5 w-5 text-gray-600 mr-3" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{device.getDisplayName()}</div>
                        <p className="text-xs text-gray-500">{device.id}</p>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          在线
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 右侧：状态和日志 */}
          <div className="space-y-6">
            {/* 任务统计 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">任务统计</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">选中联系人:</span>
                  <span className="text-sm font-medium">{selectedContacts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">选中设备:</span>
                  <span className="text-sm font-medium">{selectedDevices.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">预估费用:</span>
                  <span className="text-sm font-medium text-green-600">¥{estimatedCost.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">成功:</span>
                    <span className="text-sm font-medium text-green-600">{taskProgress.successCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">失败:</span>
                    <span className="text-sm font-medium text-red-600">{taskProgress.failureCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">跳过:</span>
                    <span className="text-sm font-medium text-yellow-600">{taskProgress.skippedCount}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="space-y-3">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || selectedContacts.length === 0 || selectedDevices.length === 0}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? '执行中...' : '开始执行'}
              </button>
              
              {taskStatus === 'running' || taskStatus === 'paused' ? (
                <button
                  onClick={handlePauseResume}
                  className="w-full bg-yellow-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-yellow-700 transition-colors"
                >
                  {taskStatus === 'running' ? '暂停任务' : '恢复任务'}
                </button>
              ) : null}
            </div>

            {/* 任务日志 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">任务日志</h3>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {taskLogs.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">暂无日志</p>
                ) : (
                  taskLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-2 rounded text-xs ${
                        log.level === 'success' ? 'bg-green-100 text-green-800' :
                        log.level === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        log.level === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{log.message}</span>
                        <span className="text-gray-500">{log.timestamp}</span>
                      </div>
                      {log.details && (
                        <div className="mt-1 text-gray-600">{log.details}</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactFollowTask;