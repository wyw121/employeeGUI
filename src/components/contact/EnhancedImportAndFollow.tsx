import React, { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Collapse,
  message,
  Progress,
  Space,
  Spin,
  Steps,
  Tag,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  LoadingOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { ContactAPI } from '../../api/ContactAPI';
import { XiaohongshuService, type XiaohongshuFollowOptions, type XiaohongshuFollowResult, type AppStatusResult, type NavigationResult } from '../../services/xiaohongshuService';

const { Text } = Typography;
const { Panel } = Collapse;

// 本地定义增强流程的组合结果类型，避免依赖全局已移除类型
interface EnhancedImportAndFollowResult {
  success: boolean;
  totalDuration: number; // 秒
  importResult: {
    success: boolean;
    importedContacts: number;
    totalContacts: number;
    failedContacts: number;
    duration?: number;
    message?: string;
  };
  appStatus?: {
    appInstalled: boolean;
    appRunning: boolean;
    appVersion?: string;
  };
  navigationResult?: {
    success: boolean;
    currentPage?: string;
    attempts?: number;
    message?: string;
  };
  followResult: XiaohongshuFollowResult;
  stepDetails?: string[];
}

interface EnhancedImportAndFollowProps {
  deviceId: string;
  contactsFilePath: string;
  options?: XiaohongshuFollowOptions;
  onComplete?: (result: EnhancedImportAndFollowResult) => void;
  onError?: (error: string) => void;
}

/**
 * 增强版VCF导入+小红书自动关注组件
 * 
 * 特点：
 * 1. 完整的状态检查和导航
 * 2. 详细的步骤进度显示
 * 3. 实时错误反馈
 * 4. 可靠性保障
 */
const EnhancedImportAndFollow: React.FC<EnhancedImportAndFollowProps> = ({
  deviceId,
  contactsFilePath,
  options,
  onComplete,
  onError,
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EnhancedImportAndFollowResult | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepDetails, setStepDetails] = useState<string[]>([]);

  // 执行增强版导入+关注流程
  const handleExecute = async () => {
    try {
      setLoading(true);
      setResult(null);
      setCurrentStep(0);
      setStepDetails([]);

      message.info('开始执行增强版VCF导入+自动关注流程...');

      // 1) 执行导入（调用已存在的 VCF 导入 API）
      const importResultRaw: any = await ContactAPI.executeVcfImport(contactsFilePath, deviceId);

      const importOk = !!importResultRaw?.success;
      setCurrentStep(1);

      // 2) 初始化与状态检查（通过 XiaohongshuService）
      await XiaohongshuService.initializeService(deviceId);
      const appStatus: AppStatusResult = await XiaohongshuService.checkAppStatus();

      setCurrentStep(2);
      // 3) 导航到通讯录
      const navigation: NavigationResult = await XiaohongshuService.navigateToContacts();

      setCurrentStep(3);
      // 4) 自动关注
      const followRes = await XiaohongshuService.autoFollowContacts(options);

      const executeResult: EnhancedImportAndFollowResult = {
        success: importOk && appStatus.app_installed && navigation.success && followRes.success,
        totalDuration: (importResultRaw?.duration || 0) + (followRes?.duration || 0),
        importResult: {
          success: importOk,
          importedContacts: importResultRaw?.importedContacts ?? importResultRaw?.imported_contacts ?? 0,
          totalContacts: importResultRaw?.totalContacts ?? importResultRaw?.total_contacts ?? 0,
          failedContacts: importResultRaw?.failedContacts ?? importResultRaw?.failed_contacts ?? 0,
          duration: importResultRaw?.duration,
          message: importResultRaw?.message,
        },
        appStatus: {
          appInstalled: appStatus.app_installed,
          appRunning: appStatus.app_running,
          appVersion: appStatus.app_version,
        },
        navigationResult: {
          success: navigation.success,
          // 兼容服务端可能未提供的字段
          currentPage: (navigation as any).currentPage,
          attempts: (navigation as any).attempts,
          message: navigation.message,
        },
        followResult: followRes,
        stepDetails: [],
      };

      setResult(executeResult);
      setStepDetails(executeResult.stepDetails || []);

      if (executeResult.success) {
        message.success('完整流程执行成功！');
        onComplete?.(executeResult);
      } else {
        message.error('流程执行失败，请查看详细信息');
        onError?.(`流程失败: ${executeResult.followResult.message}`);
      }
    } catch (error) {
      console.error('执行增强版导入+关注失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      message.error(`执行失败: ${errorMessage}`);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 获取当前步骤状态
  const getStepStatus = (stepIndex: number) => {
    if (!result) return 'wait';
    
    switch (stepIndex) {
      case 0: // VCF导入
        return result.importResult.success ? 'finish' : 'error';
      case 1: // 应用状态检查
        return result.appStatus?.appInstalled ? 'finish' : 'error';
      case 2: // 导航到通讯录
        return result.navigationResult?.success ? 'finish' : 'error';
      case 3: // 自动关注
        return result.followResult.success ? 'finish' : 'error';
      default:
        return 'wait';
    }
  };

  // 获取进度百分比
  const getProgress = () => {
    if (!result) return 0;
    
    let completedSteps = 0;
    if (result.importResult.success) completedSteps++;
    if (result.appStatus?.appInstalled) completedSteps++;
    if (result.navigationResult?.success) completedSteps++;
    if (result.followResult.success) completedSteps++;
    
    return (completedSteps / 4) * 100;
  };

  const steps = [
    {
      title: 'VCF导入',
      description: '导入联系人到设备',
      icon: result?.importResult.success ? <CheckCircleOutlined /> : undefined,
    },
    {
      title: '应用状态检查',
      description: '检查小红书应用状态',
      icon: result?.appStatus?.appInstalled ? <CheckCircleOutlined /> : undefined,
    },
    {
      title: '导航到通讯录',
      description: '导航到小红书通讯录页面',
      icon: result?.navigationResult?.success ? <CheckCircleOutlined /> : undefined,
    },
    {
      title: '自动关注',
      description: '执行自动关注操作',
      icon: result?.followResult.success ? <CheckCircleOutlined /> : undefined,
    },
  ];

  return (
    <Card
      title={
        <Space>
          <PlayCircleOutlined />
          增强版VCF导入+自动关注
          <Tag color="blue">可靠性保障</Tag>
        </Space>
      }
      extra={
        <Button
          type="primary"
          loading={loading}
          onClick={handleExecute}
          disabled={!deviceId || !contactsFilePath}
        >
          {loading ? '执行中...' : '开始执行'}
        </Button>
      }
    >
      {/* 执行进度 */}
      {(loading || result) && (
        <>
          <div style={{ marginBottom: 24 }}>
            <Progress
              percent={Math.round(getProgress())}
              status={
                result?.success 
                  ? 'success' 
                  : loading 
                    ? 'active' 
                    : 'exception'
              }
              strokeColor={result?.success ? '#52c41a' : '#1890ff'}
            />
          </div>

          <Steps
            current={currentStep}
            size="small"
            style={{ marginBottom: 24 }}
            items={steps.map((step, index) => ({
              ...step,
              status: getStepStatus(index),
            }))}
          />
        </>
      )}

      {/* 结果展示 */}
      {result && (
        <Space direction="vertical" style={{ width: '100%' }}>
          {/* 总体状态 */}
          <Alert
            type={result.success ? 'success' : 'error'}
            message={result.success ? '流程执行成功' : '流程执行失败'}
            description={
              <Space direction="vertical">
                <Text>总耗时: {result.totalDuration}秒</Text>
                {result.success && (
                  <Text type="success">
                    成功关注 {result.followResult.total_followed} 个好友
                  </Text>
                )}
              </Space>
            }
            showIcon
          />

          {/* 详细信息 */}
          <Collapse>
            <Panel header="VCF导入结果" key="import">
              <Space direction="vertical">
                <Text strong>状态: </Text>
                <Tag color={result.importResult.success ? 'green' : 'red'}>
                  {result.importResult.success ? '成功' : '失败'}
                </Tag>
                <Text>导入联系人数: {result.importResult.importedContacts}</Text>
                <Text>总联系人数: {result.importResult.totalContacts}</Text>
                <Text>失败联系人数: {result.importResult.failedContacts}</Text>
                {result.importResult.duration && (
                  <Text>导入耗时: {result.importResult.duration}秒</Text>
                )}
                {result.importResult.message && (
                  <Text type="secondary">{result.importResult.message}</Text>
                )}
              </Space>
            </Panel>

            {result.appStatus && (
              <Panel header="应用状态检查" key="app-status">
                <Space direction="vertical">
                  <Space>
                    <Text strong>应用已安装:</Text>
                    <Tag color={result.appStatus.appInstalled ? 'green' : 'red'}>
                      {result.appStatus.appInstalled ? '是' : '否'}
                    </Tag>
                  </Space>
                  <Space>
                    <Text strong>应用运行中:</Text>
                    <Tag color={result.appStatus.appRunning ? 'green' : 'red'}>
                      {result.appStatus.appRunning ? '是' : '否'}
                    </Tag>
                  </Space>
                  {result.appStatus.appVersion && (
                    <Text>应用版本: {result.appStatus.appVersion}</Text>
                  )}
                </Space>
              </Panel>
            )}

            {result.navigationResult && (
              <Panel header="导航结果" key="navigation">
                <Space direction="vertical">
                  <Space>
                    <Text strong>导航成功:</Text>
                    <Tag color={result.navigationResult.success ? 'green' : 'red'}>
                      {result.navigationResult.success ? '是' : '否'}
                    </Tag>
                  </Space>
                  <Text>当前页面: {result.navigationResult.currentPage}</Text>
                  <Text>尝试次数: {result.navigationResult.attempts}</Text>
                  {result.navigationResult.message && (
                    <Text type="secondary">{result.navigationResult.message}</Text>
                  )}
                </Space>
              </Panel>
            )}

            <Panel header="自动关注结果" key="follow">
              <Space direction="vertical">
                <Space>
                  <Text strong>关注成功:</Text>
                  <Tag color={result.followResult.success ? 'green' : 'red'}>
                    {result.followResult.success ? '是' : '否'}
                  </Tag>
                </Space>
                <Text>成功关注: {result.followResult.total_followed} 人</Text>
                <Text>处理页面: {result.followResult.pages_processed} 页</Text>
                <Text>耗时: {result.followResult.duration} 秒</Text>
                {result.followResult.message && (
                  <Text type="secondary">{result.followResult.message}</Text>
                )}
              </Space>
            </Panel>

            {stepDetails.length > 0 && (
              <Panel header="执行步骤详情" key="steps">
                <Space direction="vertical" style={{ width: '100%' }}>
                  {stepDetails.map((detail, index) => (
                    <div key={`step-${index}-${detail.slice(0, 10)}`} style={{ padding: '4px 0' }}>
                      <Space>
                        <ClockCircleOutlined style={{ color: '#1890ff' }} />
                        <Text>{detail}</Text>
                      </Space>
                    </div>
                  ))}
                </Space>
              </Panel>
            )}
          </Collapse>
        </Space>
      )}

      {/* 执行中状态 */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin
            indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
            size="large"
          />
          <div style={{ marginTop: 16 }}>
            <Text>正在执行增强版导入+关注流程...</Text>
          </div>
        </div>
      )}

      {/* 使用说明 */}
      {!loading && !result && (
        <Alert
          type="info"
          message="增强版特性"
          description={
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>✅ 完整的应用状态检查</li>
              <li>✅ 自动导航到正确页面</li>
              <li>✅ 详细的步骤进度跟踪</li>
              <li>✅ 可靠性保障和错误处理</li>
              <li>✅ 实时状态反馈</li>
            </ul>
          }
          showIcon
        />
      )}
    </Card>
  );
};

export default EnhancedImportAndFollow;

