import { AlertTriangle, ArrowRight, CheckCircle, FileDown, Heart, Play, Smartphone, Users } from 'lucide-react';
import React, { useState } from 'react';
import { Contact, ImportAndFollowResult, XiaohongshuFollowOptions } from '../../types';

interface ImportAndFollowProps {
  selectedDevice?: string;
  contactsFilePath?: string;
  contacts?: Contact[];
  onComplete?: (result: ImportAndFollowResult) => void;
  onError?: (error: string) => void;
}

export const ImportAndFollow: React.FC<ImportAndFollowProps> = ({
  selectedDevice,
  contactsFilePath,
  contacts = [],
  onComplete,
  onError
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<'import' | 'follow' | 'complete' | null>(null);
  const [result, setResult] = useState<ImportAndFollowResult | null>(null);
  const [stepProgress, setStepProgress] = useState(0);

  // 配置选项
  const [followOptions, setFollowOptions] = useState<XiaohongshuFollowOptions>({
    maxPages: 5,
    followInterval: 2000,
    skipExisting: true,
    takeScreenshots: false,
    returnToHome: true
  });

  // 执行完整的导入+关注流程
  const handleImportAndFollow = async () => {
    if (!selectedDevice) {
      onError?.('请先选择目标设备');
      return;
    }

    if (!contactsFilePath) {
      onError?.('请先选择或准备联系人文件');
      return;
    }

    try {
      setIsProcessing(true);
      setStepProgress(0);
      setResult(null);

      // 步骤1: VCF导入
      setCurrentStep('import');
      setStepProgress(10);

      // 注意：这里需要实际的API实现
      console.warn('importAndFollowXiaohongshu API 还未实现，使用模拟数据');

      // 模拟执行结果（实际应用中应该调用真实API）
      const importAndFollowResult: ImportAndFollowResult = {
        success: true,
        totalDuration: 60,
        importResult: {
          success: true,
          totalContacts: contacts.length,
          importedContacts: contacts.length,
          failedContacts: 0,
          message: '模拟VCF导入成功',
          details: 'VCF文件已生成并导入到设备',
          duration: 30,
        },
        followResult: {
          success: true,
          totalFollowed: Math.min(contacts.length, 10), // 假设关注了前10个
          pagesProcessed: 2,
          duration: 30,
          details: [],
          message: '模拟自动关注成功',
        }
      };

      // 模拟等待时间
      await new Promise(resolve => setTimeout(resolve, 2000));

      /* 实际API调用（当后端实现后启用）
      const importAndFollowResult = await ContactAPI.importAndFollowXiaohongshu(
        selectedDevice,
        contactsFilePath,
        followOptions
      );
      */

      setStepProgress(100);
      setCurrentStep('complete');
      setResult(importAndFollowResult);

      if (importAndFollowResult.success) {
        onComplete?.(importAndFollowResult);
      } else {
        onError?.('导入或关注流程失败');
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '执行失败';
      onError?.(errorMsg);
      setCurrentStep(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStepStatus = (step: string) => {
    if (!currentStep) return 'pending';

    const steps = ['import', 'follow', 'complete'];
    const currentIndex = steps.indexOf(currentStep);
    const stepIndex = steps.indexOf(step);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  const getImportStepColor = () => {
    const status = getStepStatus('import');
    if (status === 'completed') return 'text-green-600';
    if (status === 'active') return 'text-blue-600';
    return 'text-gray-400';
  };

  const getFollowStepColor = () => {
    const status = getStepStatus('follow');
    if (status === 'completed') return 'text-green-600';
    if (status === 'active') return 'text-red-600';
    return 'text-gray-400';
  };

  const getCompleteStepColor = () => {
    const status = getStepStatus('complete');
    if (status === 'completed') return 'text-green-600';
    if (status === 'active') return 'text-blue-600';
    return 'text-gray-400';
  };

  const getCurrentStepText = () => {
    if (currentStep === 'import') return '正在导入联系人...';
    if (currentStep === 'follow') return '正在自动关注...';
    return '正在处理...';
  };

  const getStepIcon = (step: string) => {
    const status = getStepStatus(step);

    if (status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    }

    if (status === 'active') {
      return (
        <div className="w-5 h-5 border-2 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
      );
    }

    switch (step) {
      case 'import':
        return <FileDown className="w-5 h-5 text-gray-400" />;
      case 'follow':
        return <Heart className="w-5 h-5 text-gray-400" />;
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-gray-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="import-and-follow bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center mb-6">
        <div className="flex items-center">
          <FileDown className="w-6 h-6 text-blue-600 mr-2" />
          <ArrowRight className="w-4 h-4 text-gray-400 mx-2" />
          <Heart className="w-6 h-6 text-red-500 mr-2" />
        </div>
        <h3 className="text-xl font-semibold text-gray-800">一键导入+关注</h3>
      </div>

      {/* 设备和文件信息 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-sm font-medium text-gray-600">目标设备:</span>
            <div className="flex items-center mt-1">
              <Smartphone className="w-4 h-4 text-blue-600 mr-1" />
              <span className="text-sm text-gray-800">
                {selectedDevice || '未选择设备'}
              </span>
            </div>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600">联系人文件:</span>
            <div className="flex items-center mt-1">
              <Users className="w-4 h-4 text-green-600 mr-1" />
              <span className="text-sm text-gray-800">
                {contactsFilePath ? `${contacts.length} 个联系人` : '未准备文件'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 流程步骤 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
          {/* 步骤1: 导入 */}
          <div className="flex items-center">
            {getStepIcon('import')}
            <div className="ml-2">
              <span className={`text-sm font-medium ${getImportStepColor()}`}>
                VCF导入
              </span>
            </div>
          </div>            <ArrowRight className="w-4 h-4 text-gray-400" />

            {/* 步骤2: 关注 */}
            <div className="flex items-center">
              {getStepIcon('follow')}
              <div className="ml-2">
                <span className={`text-sm font-medium ${getFollowStepColor()}`}>
                  自动关注
                </span>
              </div>
            </div>

            <ArrowRight className="w-4 h-4 text-gray-400" />

            {/* 步骤3: 完成 */}
            <div className="flex items-center">
              {getStepIcon('complete')}
              <div className="ml-2">
                <span className={`text-sm font-medium ${getCompleteStepColor()}`}>
                  完成
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 进度条 */}
        {isProcessing && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-600 to-red-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${stepProgress}%` }}
            ></div>
          </div>
        )}
      </div>

      {/* 关注设置 */}
      <div className="mb-6">
        <h4 className="text-lg font-medium text-gray-700 mb-3">关注设置</h4>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="maxPages" className="block text-sm font-medium text-gray-600 mb-1">
              最大页数
            </label>
            <input
              id="maxPages"
              type="number"
              min="1"
              max="20"
              value={followOptions.maxPages}
              onChange={(e) => setFollowOptions({...followOptions, maxPages: parseInt(e.target.value)})}
              disabled={isProcessing}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>

          <div>
            <label htmlFor="followInterval" className="block text-sm font-medium text-gray-600 mb-1">
              关注间隔 (秒)
            </label>
            <input
              id="followInterval"
              type="number"
              min="1"
              max="10"
              step="0.5"
              value={followOptions.followInterval ? followOptions.followInterval / 1000 : 2}
              onChange={(e) => setFollowOptions({...followOptions, followInterval: parseFloat(e.target.value) * 1000})}
              disabled={isProcessing}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={followOptions.skipExisting}
              onChange={(e) => setFollowOptions({...followOptions, skipExisting: e.target.checked})}
              disabled={isProcessing}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">跳过已关注的用户</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={followOptions.takeScreenshots}
              onChange={(e) => setFollowOptions({...followOptions, takeScreenshots: e.target.checked})}
              disabled={isProcessing}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">启用截图记录</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={followOptions.returnToHome}
              onChange={(e) => setFollowOptions({...followOptions, returnToHome: e.target.checked})}
              disabled={isProcessing}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">完成后返回主页</span>
          </label>
        </div>
      </div>

      {/* 执行按钮 */}
      <div className="mb-6">
        <button
          onClick={handleImportAndFollow}
          disabled={!selectedDevice || !contactsFilePath || isProcessing || contacts.length === 0}
          className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-red-500 text-white rounded-md hover:from-blue-700 hover:to-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200"
        >
          <Play className="w-5 h-5 mr-2" />
          {isProcessing ? getCurrentStepText() : '开始一键导入+关注'}
        </button>
      </div>

      {/* 执行结果 */}
      {result && (
        <div className="space-y-4">
          {/* 导入结果 */}
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium text-gray-700 mb-3 flex items-center">
              <FileDown className="w-5 h-5 text-blue-600 mr-2" />
              VCF导入结果
            </h4>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center">
                <span className="text-gray-600">总联系人:</span>
                <span className="ml-2 font-medium">{result.importResult.totalContacts}</span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-600">导入成功:</span>
                <span className="ml-2 font-medium text-green-600">
                  {result.importResult.importedContacts}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-600">导入失败:</span>
                <span className="ml-2 font-medium text-red-600">
                  {result.importResult.failedContacts}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-600">导入状态:</span>
                <span className={`ml-2 flex items-center ${result.importResult.success ? 'text-green-600' : 'text-red-600'}`}>
                  {result.importResult.success ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                  {result.importResult.success ? '成功' : '失败'}
                </span>
              </div>
            </div>
          </div>

          {/* 关注结果 */}
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium text-gray-700 mb-3 flex items-center">
              <Heart className="w-5 h-5 text-red-500 mr-2" />
              自动关注结果
            </h4>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center">
                <span className="text-gray-600">成功关注:</span>
                <span className="ml-2 font-medium text-green-600">
                  {result.followResult.totalFollowed}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-600">处理页数:</span>
                <span className="ml-2 font-medium">{result.followResult.pagesProcessed}</span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-600">执行时间:</span>
                <span className="ml-2 font-medium">{result.followResult.duration}秒</span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-600">关注状态:</span>
                <span className={`ml-2 flex items-center ${result.followResult.success ? 'text-green-600' : 'text-red-600'}`}>
                  {result.followResult.success ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                  {result.followResult.success ? '成功' : '失败'}
                </span>
              </div>
            </div>
          </div>

          {/* 总体结果 */}
          <div className={`p-4 border rounded-lg ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {result.success ? (
                  <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-red-600 mr-2" />
                )}
                <div>
                  <h4 className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                    {result.success ? '流程执行成功！' : '流程执行失败'}
                  </h4>
                  <p className={`text-sm ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                    总耗时: {result.totalDuration}秒
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportAndFollow;
