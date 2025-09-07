import { AlertTriangle, CheckCircle, Heart, Smartphone } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {
    AppStatusResult,
    XiaohongshuFollowResult
} from '../../types';

interface XiaohongshuAutoFollowProps {
  selectedDevice?: string;
  onFollowComplete?: (result: XiaohongshuFollowResult) => void;
  onError?: (error: string) => void;
}

export const XiaohongshuAutoFollow: React.FC<XiaohongshuAutoFollowProps> = ({
  selectedDevice,
  onFollowComplete,
  onError
}) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followResult, setFollowResult] = useState<XiaohongshuFollowResult | null>(null);
  const [appStatus, setAppStatus] = useState<AppStatusResult | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [followProgress, setFollowProgress] = useState(0);

  // 检查小红书应用状态
  const checkAppStatus = async () => {
    if (!selectedDevice) return;

    try {
      setCurrentStep('检查小红书应用状态...');
      // 模拟检查结果（实际应调用真实API）
      const status: AppStatusResult = {
        appInstalled: true,
        appRunning: false,
        appVersion: '8.0.0',
        packageName: 'com.xingin.xhs'
      };
      /* 实际API调用（当后端实现后启用）
      const status = await ContactAPI.checkXiaohongshuAppStatus(selectedDevice);
      */
      setAppStatus(status);
      setCurrentStep(status.appInstalled ? '小红书应用已安装' : '未检测到小红书应用');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '检查应用状态失败';
      onError?.(errorMsg);
      setCurrentStep('');
    }
  };

  // 导航到小红书联系人页面
  const navigateToContacts = async () => {
    if (!selectedDevice) return;

    try {
      setCurrentStep('导航到小红书联系人页面...');
      // 模拟导航结果（实际应调用真实API）
      await new Promise(resolve => setTimeout(resolve, 2000));

      setCurrentStep('已导航到联系人页面');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '导航失败';
      onError?.(errorMsg);
      setCurrentStep('导航失败');
    }
  };

  // 开始自动关注
  const startAutoFollow = async () => {
    if (!selectedDevice) {
      onError?.('请选择设备');
      return;
    }

    try {
      setIsFollowing(true);
      setFollowResult(null);
      setFollowProgress(0);
      setCurrentStep('开始自动关注...');

      // 步骤1：检查应用状态
      await checkAppStatus();
      setFollowProgress(25);

      // 步骤2：导航到联系人页面
      await navigateToContacts();
      setFollowProgress(50);

      // 步骤3：执行自动关注
      setCurrentStep('正在执行自动关注...');

      // 模拟关注结果（实际应调用真实API）
      const result: XiaohongshuFollowResult = {
        success: true,
        totalFollowed: 5,
        pagesProcessed: 3,
        duration: 45,
        details: Array.from({ length: 5 }, (_, i) => ({
          userPosition: { x: 100 + i * 10, y: 200 + i * 15 },
          followSuccess: Math.random() > 0.2,
          buttonTextBefore: '关注',
          buttonTextAfter: '已关注'
        })),
        message: '自动关注完成'
      };

      /* 实际API调用（当后端实现后启用）
      const result = await ContactAPI.xiaohongshuAutoFollow(selectedDevice, followOptions);
      */

      setFollowProgress(100);
      setCurrentStep('自动关注完成');
      setFollowResult(result);
      onFollowComplete?.(result);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '自动关注失败';
      onError?.(errorMsg);
      setCurrentStep('自动关注失败');
    } finally {
      setIsFollowing(false);
    }
  };

  // 在组件挂载时检查应用状态
  useEffect(() => {
    if (selectedDevice) {
      checkAppStatus();
    }
  }, [selectedDevice]);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center mb-6">
        <Heart className="w-8 h-8 text-red-500 mr-3" />
        <h2 className="text-2xl font-bold text-gray-800">小红书自动关注</h2>
      </div>

      {/* 设备选择状态 */}
      {!selectedDevice && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
            <span className="text-yellow-800">请先选择一个Android设备</span>
          </div>
        </div>
      )}

      {/* 设备信息 */}
      {selectedDevice && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <Smartphone className="w-5 h-5 text-blue-600 mr-2" />
            <span className="text-blue-800">
              选中设备: <strong>{selectedDevice}</strong>
            </span>
          </div>
        </div>
      )}

      {/* 应用状态显示 */}
      {appStatus && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">小红书应用状态</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <span className="text-sm text-gray-600 mr-2">应用安装:</span>
              <span className={`text-sm font-medium ${appStatus.appInstalled ? 'text-green-600' : 'text-red-600'}`}>
                {appStatus.appInstalled ? '已安装' : '未安装'}
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-600 mr-2">应用运行:</span>
              <span className={`text-sm font-medium ${appStatus.appRunning ? 'text-green-600' : 'text-gray-600'}`}>
                {appStatus.appRunning ? '运行中' : '未运行'}
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-600 mr-2">版本:</span>
              <span className="text-sm font-medium text-gray-800">{appStatus.appVersion}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-600 mr-2">包名:</span>
              <span className="text-sm font-medium text-gray-800">{appStatus.packageName}</span>
            </div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={checkAppStatus}
          disabled={!selectedDevice || isFollowing}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          检查应用状态
        </button>

        <button
          onClick={startAutoFollow}
          disabled={!selectedDevice || isFollowing || !appStatus?.appInstalled}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
        >
          <Heart className="w-4 h-4 mr-2" />
          {isFollowing ? '正在关注...' : '开始自动关注'}
        </button>
      </div>

      {/* 进度显示 */}
      {isFollowing && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">关注进度</span>
            <span className="text-sm font-medium text-gray-800">{followProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-red-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${followProgress}%` }}
            />
          </div>
          {currentStep && (
            <p className="text-sm text-gray-600 mt-2">{currentStep}</p>
          )}
        </div>
      )}

      {/* 关注结果显示 */}
      {followResult && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">关注结果</h3>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{followResult.totalFollowed}</div>
              <div className="text-sm text-gray-600">成功关注</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{followResult.pagesProcessed}</div>
              <div className="text-sm text-gray-600">处理页面</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{followResult.duration}s</div>
              <div className="text-sm text-gray-600">耗时</div>
            </div>
          </div>

          <div className="mb-4">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              followResult.success
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {followResult.success ? (
                <CheckCircle className="w-4 h-4 mr-1" />
              ) : (
                <AlertTriangle className="w-4 h-4 mr-1" />
              )}
              {followResult.message}
            </div>
          </div>

          {/* 关注详情 */}
          {followResult.details && followResult.details.length > 0 && (
            <div>
              <details className="cursor-pointer">
                <summary className="font-medium text-gray-700 hover:text-gray-900">
                  关注详情 ({followResult.details.length} 项)
                </summary>
                <div className="mt-2 max-h-40 overflow-auto">
                  {followResult.details.map((detail) => (
                    <div key={`${detail.userPosition.x}-${detail.userPosition.y}`} className="flex items-center justify-between py-1 px-2 text-xs border-b last:border-b-0">
                      <span className="flex-1">位置: ({detail.userPosition.x}, {detail.userPosition.y})</span>
                      <span className="flex items-center">
                        {detail.followSuccess ? (
                          <CheckCircle className="w-3 h-3 text-green-600 mr-1" />
                        ) : (
                          <AlertTriangle className="w-3 h-3 text-red-600 mr-1" />
                        )}
                        {detail.buttonTextBefore} → {detail.buttonTextAfter}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default XiaohongshuAutoFollow;
