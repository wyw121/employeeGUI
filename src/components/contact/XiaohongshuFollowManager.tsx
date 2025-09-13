import React, { useState, useEffect } from 'react';import React, { useState } from 'react';import React, { useState } from 'react';import React, { useState, useEffect } from 'react';import React, { useState } from 'react';import React, { useState } from 'react';import {import {import {

import {

  Alert,import {

  Button,

  Card,  Button,import {

  Col,

  Divider,  Card,

  InputNumber,

  Progress,  Space,  Button,import {

  Row,

  Select,  Steps,

  Space,

  Steps,  Alert,  Card,

  Switch,

  Tag,  Typography,

  Typography,

  message  InputNumber,  Space,  Button,import {

} from 'antd';

import {  Switch,

  CheckCircleOutlined,

  HeartOutlined,  Progress,  Steps,

  PlayCircleOutlined,

  SettingOutlined,  Row,

  StopOutlined

} from '@ant-design/icons';  Col,  Alert,  Card,

import { Device, VcfImportResult, XiaohongshuFollowResult } from '../../types';

import { XiaohongshuService } from '../../services/xiaohongshuService';  Tag,



const { Text, Title } = Typography;  Divider,  Typography,

const { Step } = Steps;

  message

interface XiaohongshuFollowManagerProps {

  importResults?: VcfImportResult[];} from 'antd';  InputNumber,  Space,  CheckCircleOutlined,import {

  selectedDevice?: Device;

  onWorkflowComplete?: (result: XiaohongshuFollowResult) => void;import {

  onError?: (error: string) => void;

}  HeartOutlined,  Switch,



interface FollowConfig {  SettingOutlined,

  maxPages: number;

  followInterval: number;  PlayCircleOutlined,  Progress,  Steps,

  skipExisting: boolean;

  returnToHome: boolean;  CheckCircleOutlined,

}

  ClockCircleOutlined,  Row,

interface FollowProgress {

  currentPage: number;  AndroidOutlined

  totalPages: number;

  followedCount: number;} from '@ant-design/icons';  Col,  Alert,  HeartOutlined,

  failedCount: number;

  isRunning: boolean;import { Device, VcfImportResult, XiaohongshuFollowResult } from '../../types';

  currentStep: number;

}import { XiaohongshuService } from '../../services/xiaohongshuService';  Tag,



export const XiaohongshuFollowManager: React.FC<XiaohongshuFollowManagerProps> = ({

  importResults,

  selectedDevice,const { Text, Title } = Typography;  Divider,  Typography,

  onWorkflowComplete,

  onError,const { Step } = Steps;

}) => {

  const [followConfig, setFollowConfig] = useState<FollowConfig>({  message

    maxPages: 3,

    followInterval: 2000,interface XiaohongshuFollowManagerProps {

    skipExisting: true,

    returnToHome: true,  importResults?: VcfImportResult[];} from 'antd';  Select,  PlayCircleOutlined,  CheckCircleOutlined,  CheckCircleOutlined,

  });

  selectedDevice?: Device;

  const [progress, setProgress] = useState<FollowProgress>({

    currentPage: 0,  onWorkflowComplete?: (result: XiaohongshuFollowResult) => void;import {

    totalPages: 0,

    followedCount: 0,  onError?: (error: string) => void;

    failedCount: 0,

    isRunning: false,}  HeartOutlined,  InputNumber,

    currentStep: 0,

  });



  const [logs, setLogs] = useState<string[]>([]);interface FollowConfig {  SettingOutlined,

  const xiaohongshuService = new XiaohongshuService();

  maxPages: number;

  useEffect(() => {

    if (importResults && importResults.length > 0) {  followInterval: number;  PlayCircleOutlined,  Switch,  SettingOutlined

      const totalContacts = importResults.reduce((sum, result) => sum + result.importedCount, 0);

      addLog(`📊 导入结果：共 ${totalContacts} 个联系人待关注`);  skipExisting: boolean;

    }

  }, [importResults]);  returnToHome: boolean;  CheckCircleOutlined,



  const addLog = (message: string) => {}

    const timestamp = new Date().toLocaleTimeString();

    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);  ClockCircleOutlined,  Progress,

  };

export const XiaohongshuFollowManager: React.FC<XiaohongshuFollowManagerProps> = ({

  const handleStartFollow = async () => {

    if (!selectedDevice) {  importResults,  AndroidOutlined

      message.error('请先选择设备');

      return;  selectedDevice,

    }

  onWorkflowComplete,} from '@ant-design/icons';  Row,} from '@ant-design/icons';  HeartOutlined,

    if (!importResults || importResults.length === 0) {

      message.error('没有可关注的联系人');  onError

      return;

    }}) => {import { Device, VcfImportResult, XiaohongshuFollowResult } from '../../types';



    setProgress(prev => ({ ...prev, isRunning: true, currentStep: 1 }));  const [currentStep, setCurrentStep] = useState(0);

    addLog('🚀 开始小红书自动关注流程');

  const [isFollowing, setIsFollowing] = useState(false);import { XiaohongshuService } from '../../services/xiaohongshuService';  Col,

    try {

      // 第一步：初始化  const [followConfig, setFollowConfig] = useState<FollowConfig>({

      addLog('📱 正在初始化小红书应用...');

          maxPages: 3,

      // 第二步：开始关注流程

      setProgress(prev => ({ ...prev, currentStep: 2, totalPages: followConfig.maxPages }));    followInterval: 2000,

      

      let totalFollowed = 0;    skipExisting: true,const { Text, Title } = Typography;  Tag,import {

      let totalFailed = 0;

    returnToHome: true

      for (let page = 1; page <= followConfig.maxPages; page++) {

        if (!progress.isRunning) break;  });const { Step } = Steps;



        setProgress(prev => ({ ...prev, currentPage: page }));  const [progress, setProgress] = useState(0);

        addLog(`📄 处理第 ${page}/${followConfig.maxPages} 页`);

  const [statusMessage, setStatusMessage] = useState('');  Divider,

        try {

          // 模拟关注操作  const [followResult, setFollowResult] = useState<XiaohongshuFollowResult | null>(null);

          await new Promise(resolve => setTimeout(resolve, followConfig.followInterval));

          interface XiaohongshuFollowManagerProps {

          const followedThisPage = Math.floor(Math.random() * 5) + 1;

          totalFollowed += followedThisPage;  const startWorkflow = async () => {

          

          setProgress(prev => ({     if (!selectedDevice) {  importResults?: VcfImportResult[];  message  Alert,  PlayCircleOutlined,  HeartOutlined,  AndroidOutlined,  AndroidOutlined,

            ...prev, 

            followedCount: totalFollowed,      onError?.('请先选择设备');

            failedCount: totalFailed 

          }));      return;  selectedDevice?: Device;

          

          addLog(`✅ 第 ${page} 页完成，关注了 ${followedThisPage} 个用户`);    }

          

        } catch (error) {  onWorkflowComplete?: (result: XiaohongshuFollowResult) => void;} from 'antd';

          totalFailed++;

          addLog(`❌ 第 ${page} 页出现错误: ${error}`);    try {

        }

      setIsFollowing(true);  onError?: (error: string) => void;

        // 页面间延迟

        if (page < followConfig.maxPages) {      setCurrentStep(0);

          await new Promise(resolve => setTimeout(resolve, 1000));

        }      setProgress(0);}import {  Button,

      }

      setStatusMessage('开始自动关注流程...');

      // 第三步：完成

      setProgress(prev => ({ ...prev, currentStep: 3, isRunning: false }));

      addLog(`🎉 关注流程完成！总共关注 ${totalFollowed} 个用户，失败 ${totalFailed} 个`);

      // 步骤1: 检查应用状态

      const result: XiaohongshuFollowResult = {

        success: true,      setStatusMessage('检查小红书应用状态...');interface FollowConfig {  HeartOutlined,

        totalFollowed,

        failedAttempts: totalFailed,      const appStatus = await XiaohongshuService.checkAppStatus(selectedDevice.id.toString());

        processedPages: followConfig.maxPages,

        logs: logs,        maxPages: number;

        timestamp: new Date().toISOString(),

      };      if (!appStatus.app_installed) {



      onWorkflowComplete?.(result);        throw new Error('小红书应用未安装');  followInterval: number;  SettingOutlined,  Card,  SettingOutlined

      message.success('关注流程已完成！');

      }

    } catch (error) {

      const errorMessage = error instanceof Error ? error.message : '未知错误';        skipExisting: boolean;

      addLog(`💥 关注流程失败: ${errorMessage}`);

      setProgress(prev => ({ ...prev, isRunning: false }));      setCurrentStep(1);

      onError?.(errorMessage);

      message.error(`关注失败: ${errorMessage}`);      setProgress(25);  returnToHome: boolean;  PlayCircleOutlined,

    }

  };



  const handleStopFollow = () => {      // 步骤2: 导航到通讯录页面}

    setProgress(prev => ({ ...prev, isRunning: false }));

    addLog('⏹️ 用户停止了关注流程');      setStatusMessage('导航到通讯录页面...');

    message.info('已停止关注流程');

  };      const navResult = await XiaohongshuService.navigateToContactsPage(selectedDevice.id.toString());  CheckCircleOutlined,  Space,



  const steps = [      

    {

      title: '准备阶段',      if (!navResult.success) {export const XiaohongshuFollowManager: React.FC<XiaohongshuFollowManagerProps> = ({

      description: '检查设备和数据',

    },        throw new Error(navResult.message);

    {

      title: '执行关注',      }  importResults,  ClockCircleOutlined,

      description: '自动关注用户',

    },      

    {

      title: '完成',      setCurrentStep(2);  selectedDevice,

      description: '关注流程结束',

    },      setProgress(50);

  ];

  onWorkflowComplete,  AndroidOutlined  Steps,} from '@ant-design/icons';  PlayCircleOutlined,

  const getProgressPercent = () => {

    if (progress.totalPages === 0) return 0;      // 步骤3: 执行自动关注

    return Math.round((progress.currentPage / progress.totalPages) * 100);

  };      setStatusMessage('执行自动关注...');  onError



  return (      const followOptions = {

    <div className="space-y-6">

      <Card>        max_pages: followConfig.maxPages,}) => {} from '@ant-design/icons';

        <Title level={4}>

          <HeartOutlined className="mr-2 text-red-500" />        follow_interval: followConfig.followInterval,

          小红书自动关注

        </Title>        skip_existing: followConfig.skipExisting,  const [currentStep, setCurrentStep] = useState(0);

        <Text type="secondary">

          基于导入的联系人数据，自动在小红书上关注对应用户        return_to_home: followConfig.returnToHome

        </Text>

      </Card>      };  const [isFollowing, setIsFollowing] = useState(false);import { Device, VcfImportResult, XiaohongshuFollowResult } from '../../types';  Tag,



      {/* 步骤指示器 */}

      <Card>

        <Steps current={progress.currentStep} items={steps} />      const result = await XiaohongshuService.autoFollowContacts(  const [followConfig, setFollowConfig] = useState<FollowConfig>({

      </Card>

        selectedDevice.id.toString(),

      {/* 配置面板 */}

      <Card title="关注配置" extra={        followOptions    maxPages: 3,import { XiaohongshuService } from '../../services/xiaohongshuService';

        <Tag color={selectedDevice ? 'green' : 'red'}>

          {selectedDevice ? `设备: ${selectedDevice.name}` : '未选择设备'}      );

        </Tag>

      }>    followInterval: 2000,

        <Row gutter={[16, 16]}>

          <Col span={12}>      setFollowResult(result);

            <Space direction="vertical" style={{ width: '100%' }}>

              <div>      setCurrentStep(3);    skipExisting: true,  Typography,import {

                <Text strong>最大页数：</Text>

                <InputNumber      setProgress(100);

                  min={1}

                  max={10}      setStatusMessage(`关注完成: 成功关注 ${result.total_followed} 个用户`);    returnToHome: true

                  value={followConfig.maxPages}

                  onChange={(value) => setFollowConfig(prev => ({ ...prev, maxPages: value || 1 }))}      

                  disabled={progress.isRunning}

                />      message.success(`成功关注 ${result.total_followed} 个用户！`);  });const { Text, Title } = Typography;

              </div>

              <div>      onWorkflowComplete?.(result);

                <Text strong>关注间隔 (毫秒)：</Text>

                <InputNumber  const [progress, setProgress] = useState(0);

                  min={1000}

                  max={10000}    } catch (error) {

                  step={500}

                  value={followConfig.followInterval}      const errorMsg = `自动关注失败: ${error}`;  const [statusMessage, setStatusMessage] = useState('');const { Step } = Steps;  message

                  onChange={(value) => setFollowConfig(prev => ({ ...prev, followInterval: value || 2000 }))}

                  disabled={progress.isRunning}      setStatusMessage(errorMsg);

                />

              </div>      onError?.(errorMsg);  const [followResult, setFollowResult] = useState<XiaohongshuFollowResult | null>(null);

            </Space>

          </Col>      message.error(errorMsg);

          <Col span={12}>

            <Space direction="vertical">    } finally {  const [appStatus, setAppStatus] = useState<any>(null);

              <div>

                <Switch      setIsFollowing(false);

                  checked={followConfig.skipExisting}

                  onChange={(checked) => setFollowConfig(prev => ({ ...prev, skipExisting: checked }))}    }

                  disabled={progress.isRunning}

                />  };

                <Text className="ml-2">跳过已关注用户</Text>

              </div>  // 检查小红书应用状态interface XiaohongshuFollowManagerProps {} from 'antd';  Alert,  SettingOutlined  CheckCircleOutlined,  CheckCircleOutlined,

              <div>

                <Switch  const resetWorkflow = () => {

                  checked={followConfig.returnToHome}

                  onChange={(checked) => setFollowConfig(prev => ({ ...prev, returnToHome: checked }))}    setCurrentStep(0);  const checkAppStatus = async () => {

                  disabled={progress.isRunning}

                />    setProgress(0);

                <Text className="ml-2">完成后返回首页</Text>

              </div>    setFollowResult(null);    if (!selectedDevice) return;  importResults?: VcfImportResult[];

            </Space>

          </Col>    setStatusMessage('');

        </Row>

      </Card>  };    



      {/* 进度显示 */}

      {progress.isRunning && (

        <Card title="执行进度">  return (    try {  selectedDevice?: Device;import { Device, VcfImportResult } from '../../types';

          <Space direction="vertical" style={{ width: '100%' }}>

            <Progress     <div className="xiaohongshu-follow-manager">

              percent={getProgressPercent()} 

              status={progress.isRunning ? 'active' : 'success'}      <div className="mb-4">      setStatusMessage('检查小红书应用状态...');

              format={() => `${progress.currentPage}/${progress.totalPages}`}

            />        <Title level={4}>

            <Row gutter={16}>

              <Col span={8}>          <HeartOutlined className="mr-2" />      const status = await XiaohongshuService.checkAppStatus(selectedDevice.id.toString());  onWorkflowComplete?: (result: XiaohongshuFollowResult) => void;

                <Card size="small">

                  <div className="text-center">          小红书自动关注

                    <div className="text-2xl font-bold text-green-500">{progress.followedCount}</div>

                    <div className="text-gray-500">已关注</div>        </Title>      setAppStatus(status);

                  </div>

                </Card>      </div>

              </Col>

              <Col span={8}>        onError?: (error: string) => void;  Button,

                <Card size="small">

                  <div className="text-center">      <Steps current={currentStep} className="mb-6">

                    <div className="text-2xl font-bold text-red-500">{progress.failedCount}</div>

                    <div className="text-gray-500">失败</div>        <Step      if (!status.app_installed) {

                  </div>

                </Card>          title="检查应用"

              </Col>

              <Col span={8}>          description="验证小红书应用状态"        onError?.('小红书应用未安装');}

                <Card size="small">

                  <div className="text-center">          icon={<AndroidOutlined />}

                    <div className="text-2xl font-bold text-blue-500">{progress.currentPage}</div>

                    <div className="text-gray-500">当前页</div>        />        return;

                  </div>

                </Card>        <Step

              </Col>

            </Row>          title="导航页面"      }const { Text } = Typography;

          </Space>

        </Card>          description="前往通讯录页面"

      )}

          icon={<ClockCircleOutlined />}      

      {/* 控制按钮 */}

      <Card>        />

        <Space>

          <Button        <Step      setCurrentStep(1);interface FollowConfig {

            type="primary"

            icon={<PlayCircleOutlined />}          title="自动关注"

            onClick={handleStartFollow}

            disabled={progress.isRunning || !selectedDevice}          description="执行关注操作"      setStatusMessage('应用状态检查完成');

            size="large"

          >          icon={<HeartOutlined />}

            开始关注

          </Button>        />    } catch (error) {  maxPages: number;const { Step } = Steps;  Card,} from '@ant-design/icons';

          <Button

            danger        <Step

            icon={<StopOutlined />}

            onClick={handleStopFollow}          title="完成"      const errorMsg = `检查应用状态失败: ${error}`;

            disabled={!progress.isRunning}

            size="large"          description="关注流程完成"

          >

            停止关注          icon={<CheckCircleOutlined />}      setStatusMessage(errorMsg);  followInterval: number;

          </Button>

        </Space>        />

      </Card>

      </Steps>      onError?.(errorMsg);

      {/* 执行日志 */}

      {logs.length > 0 && (

        <Card title="执行日志" extra={

          <Button size="small" onClick={() => setLogs([])}>      <Card title="设备信息" className="mb-4" size="small">    }  skipExisting: boolean;

            清空日志

          </Button>        {selectedDevice ? (

        }>

          <div className="bg-gray-50 p-4 rounded max-h-60 overflow-y-auto">          <div>  };

            {logs.map((log, index) => (

              <div key={index} className="text-sm mb-1 font-mono">            <Tag color="blue" icon={<AndroidOutlined />}>

                {log}

              </div>              {selectedDevice.name}  returnToHome: boolean;

            ))}

          </div>            </Tag>

        </Card>

      )}            <Text className="ml-2">状态: </Text>  // 导航到通讯录页面



      {/* 数据概览 */}            <Tag color={selectedDevice.status === 'connected' ? 'green' : 'red'}>

      {importResults && importResults.length > 0 && (

        <Card title="导入数据概览">              {selectedDevice.status === 'connected' ? '已连接' : '未连接'}  const navigateToContacts = async () => {}interface XiaohongshuFollowManagerProps {  Space,

          <Row gutter={16}>

            {importResults.map((result, index) => (            </Tag>

              <Col span={8} key={index}>

                <Card size="small">          </div>    if (!selectedDevice) return;

                  <div className="text-center">

                    <div className="text-lg font-bold">{result.importedCount}</div>        ) : (

                    <div className="text-gray-500">{result.source}</div>

                    <Tag color={result.success ? 'green' : 'red'}>          <Alert type="warning" message="请先选择设备" />    

                      {result.success ? '成功' : '失败'}

                    </Tag>        )}

                  </div>

                </Card>      </Card>    try {

              </Col>

            ))}

          </Row>

        </Card>      {importResults && importResults.length > 0 && (      setStatusMessage('导航到小红书通讯录页面...');export const XiaohongshuFollowManager: React.FC<XiaohongshuFollowManagerProps> = ({  importResults?: VcfImportResult[];

      )}

    </div>        <Card title="导入结果" className="mb-4" size="small">

  );

};          <Text>      setProgress(20);



export default XiaohongshuFollowManager;            已导入 <Text strong>{importResults.reduce((sum, result) => sum + result.importedContacts, 0)}</Text> 个联系人到 <Text strong>{importResults.length}</Text> 台设备

          </Text>        importResults,

        </Card>

      )}      const result = await XiaohongshuService.navigateToContactsPage(selectedDevice.id.toString());



      <Card title="关注配置" className="mb-4" size="small">        selectedDevice,  selectedDevice?: Device;  Steps,import {  ClockCircleOutlined,  ClockCircleOutlined,

        <Row gutter={16}>

          <Col span={6}>      if (result.success) {

            <div className="mb-3">

              <Text>最大页数:</Text>        setCurrentStep(2);  onWorkflowComplete,

              <InputNumber

                min={1}        setStatusMessage('成功导航到通讯录页面');

                max={10}

                value={followConfig.maxPages}        setProgress(40);  onError  onWorkflowComplete?: (result: any) => void;

                onChange={(value) => setFollowConfig(prev => ({ ...prev, maxPages: value || 3 }))}

                className="w-full"      } else {

              />

            </div>        throw new Error(result.message);}) => {

          </Col>

          <Col span={6}>      }

            <div className="mb-3">

              <Text>关注间隔(ms):</Text>    } catch (error) {  const [currentStep, setCurrentStep] = useState(0);  onError?: (error: string) => void;  Tag,

              <InputNumber

                min={1000}      const errorMsg = `导航失败: ${error}`;

                max={10000}

                step={500}      setStatusMessage(errorMsg);  const [isFollowing, setIsFollowing] = useState(false);

                value={followConfig.followInterval}

                onChange={(value) => setFollowConfig(prev => ({ ...prev, followInterval: value || 2000 }))}      onError?.(errorMsg);

                className="w-full"

              />    }  const [followConfig, setFollowConfig] = useState<FollowConfig>({}

            </div>

          </Col>  };

          <Col span={6}>

            <div className="mb-3">    maxPages: 3,

              <Text>跳过已关注:</Text>

              <Switch  // 执行自动关注

                checked={followConfig.skipExisting}

                onChange={(checked) => setFollowConfig(prev => ({ ...prev, skipExisting: checked }))}  const executeAutoFollow = async () => {    followInterval: 2000,  Typography,  Alert,

                className="ml-2"

              />    if (!selectedDevice) return;

            </div>

          </Col>        skipExisting: true,

          <Col span={6}>

            <div className="mb-3">    try {

              <Text>完成后返回:</Text>

              <Switch      setIsFollowing(true);    returnToHome: trueexport const XiaohongshuFollowManager: React.FC<XiaohongshuFollowManagerProps> = ({

                checked={followConfig.returnToHome}

                onChange={(checked) => setFollowConfig(prev => ({ ...prev, returnToHome: checked }))}      setStatusMessage('开始自动关注...');

                className="ml-2"

              />      setProgress(60);  });

            </div>

          </Col>      

        </Row>

      </Card>      const options = {  const [progress, setProgress] = useState(0);  importResults = [],  message



      <Card title="执行进度" className="mb-4" size="small">        max_pages: followConfig.maxPages,

        <Progress 

          percent={progress}        follow_interval: followConfig.followInterval,  const [statusMessage, setStatusMessage] = useState('');

          status={isFollowing ? 'active' : 'normal'}

          className="mb-2"        skip_existing: followConfig.skipExisting,

        />

        <Text>{statusMessage}</Text>        return_to_home: followConfig.returnToHome  const [followResult, setFollowResult] = useState<XiaohongshuFollowResult | null>(null);  selectedDevice,

      </Card>

      };

      {followResult && (

        <Card title="关注结果" className="mb-4" size="small">        const [appStatus, setAppStatus] = useState<any>(null);

          <Row gutter={16}>

            <Col span={6}>      const result = await XiaohongshuService.autoFollowContacts(

              <div className="text-center">

                <div className="text-2xl font-bold text-pink-600">{followResult.total_followed}</div>        selectedDevice.id.toString(),  onWorkflowComplete,} from 'antd';  Button,  ControlOutlined,  ControlOutlined,

                <div className="text-sm text-gray-600">关注用户</div>

              </div>        options

            </Col>

            <Col span={6}>      );  // 检查小红书应用状态

              <div className="text-center">

                <div className="text-2xl font-bold text-purple-600">{followResult.pages_processed}</div>      

                <div className="text-sm text-gray-600">处理页面</div>

              </div>      setFollowResult(result);  const checkAppStatus = async () => {  onError,

            </Col>

            <Col span={6}>      setCurrentStep(3);

              <div className="text-center">

                <div className="text-2xl font-bold text-blue-600">{Math.round(followResult.duration)}s</div>      setProgress(100);    if (!selectedDevice) return;

                <div className="text-sm text-gray-600">耗时</div>

              </div>      setStatusMessage(`关注完成: 成功关注 ${result.total_followed} 个用户`);

            </Col>

            <Col span={6}>          }) => {import { Device, VcfImportResult } from '../../types';

              <div className="text-center">

                <div className={`text-2xl font-bold ${followResult.success ? 'text-green-600' : 'text-red-600'}`}>      message.success(`成功关注 ${result.total_followed} 个用户！`);

                  {followResult.success ? '成功' : '失败'}

                </div>      onWorkflowComplete?.(result);    try {

                <div className="text-sm text-gray-600">状态</div>

              </div>      

            </Col>

          </Row>    } catch (error) {      setStatusMessage('检查小红书应用状态...');  const [currentStep, setCurrentStep] = useState(0);

          

          <Divider />      const errorMsg = `自动关注失败: ${error}`;

          

          <div className="mb-3">      setStatusMessage(errorMsg);      const status = await XiaohongshuService.checkAppStatus(selectedDevice.id.toString());

            <Text>{followResult.message}</Text>

          </div>      onError?.(errorMsg);

        </Card>

      )}    } finally {      setAppStatus(status);  const [isExecuting, setIsExecuting] = useState(false);  Card,



      <div className="text-center">      setIsFollowing(false);

        <Space>

          <Button    }      

            type="primary"

            icon={<PlayCircleOutlined />}  };

            onClick={startWorkflow}

            loading={isFollowing}      if (!status.app_installed) {

            disabled={!selectedDevice || selectedDevice.status !== 'connected'}

            size="large"  // 开始完整工作流程

          >

            {isFollowing ? '执行中...' : '开始自动关注'}  const startWorkflow = async () => {        onError?.('小红书应用未安装');

          </Button>

              setCurrentStep(0);

          {followResult && (

            <Button    setProgress(0);        return;  const handleStartWorkflow = async () => {const { Text } = Typography;

              icon={<SettingOutlined />}

              onClick={resetWorkflow}    setFollowResult(null);

            >

              重新配置          }

            </Button>

          )}    await checkAppStatus();

        </Space>

      </div>    if (currentStep >= 1) {          if (!selectedDevice) {

    </div>

  );      await navigateToContacts();

};

      if (currentStep >= 2) {      setCurrentStep(1);

export default XiaohongshuFollowManager;
        await executeAutoFollow();

      }      setStatusMessage('应用状态检查完成');      message.error('请先选择要使用的设备');const { Step } = Steps;  Space,  HeartOutlined,  HeartOutlined,

    }

  };    } catch (error) {



  const renderSteps = () => (      const errorMsg = `检查应用状态失败: ${error}`;      onError?.('未选择设备');

    <Steps current={currentStep} className="mb-6">

      <Step      setStatusMessage(errorMsg);

        title="检查应用"

        description="验证小红书应用状态"      onError?.(errorMsg);      return;

        icon={<AndroidOutlined />}

      />    }

      <Step

        title="导航页面"  };    }

        description="前往通讯录页面"

        icon={<ClockCircleOutlined />}

      />

      <Step  // 导航到通讯录页面interface XiaohongshuFollowManagerProps {  Steps,

        title="自动关注"

        description="执行关注操作"  const navigateToContacts = async () => {

        icon={<HeartOutlined />}

      />    if (!selectedDevice) return;    setIsExecuting(true);

      <Step

        title="完成"    

        description="关注流程完成"

        icon={<CheckCircleOutlined />}    try {    setCurrentStep(1);  importResults?: VcfImportResult[];

      />

    </Steps>      setStatusMessage('导航到小红书通讯录页面...');

  );

      setProgress(20);

  const renderConfiguration = () => (

    <Card title="关注配置" className="mb-4" size="small">      

      <Row gutter={16}>

        <Col span={6}>      const result = await XiaohongshuService.navigateToContactsPage(selectedDevice.id.toString());    try {  selectedDevice?: Device;  Tag,  LoadingOutlined,  InfoCircleOutlined,

          <div className="mb-3">

            <Text>最大页数:</Text>      

            <InputNumber

              min={1}      if (result.success) {      // 模拟工作流程

              max={10}

              value={followConfig.maxPages}        setCurrentStep(2);

              onChange={(value) => setFollowConfig(prev => ({ ...prev, maxPages: value || 3 }))}

              className="w-full"        setStatusMessage('成功导航到通讯录页面');      await new Promise(resolve => setTimeout(resolve, 2000));  onWorkflowComplete?: (result: any) => void;

            />

          </div>        setProgress(40);

        </Col>

        <Col span={6}>      } else {      

          <div className="mb-3">

            <Text>关注间隔(ms):</Text>        throw new Error(result.message);

            <InputNumber

              min={1000}      }      setCurrentStep(2);  onError?: (error: string) => void;  Typography,

              max={10000}

              step={500}    } catch (error) {

              value={followConfig.followInterval}

              onChange={(value) => setFollowConfig(prev => ({ ...prev, followInterval: value || 2000 }))}      const errorMsg = `导航失败: ${error}`;      message.success('小红书关注流程完成');

              className="w-full"

            />      setStatusMessage(errorMsg);

          </div>

        </Col>      onError?.(errorMsg);      }

        <Col span={6}>

          <div className="mb-3">    }

            <Text>跳过已关注:</Text>

            <Switch  };      onWorkflowComplete?.({

              checked={followConfig.skipExisting}

              onChange={(checked) => setFollowConfig(prev => ({ ...prev, skipExisting: checked }))}

              className="ml-2"

            />  // 执行自动关注        success: true,  message  PlayCircleOutlined,  LoadingOutlined,

          </div>

        </Col>  const executeAutoFollow = async () => {

        <Col span={6}>

          <div className="mb-3">    if (!selectedDevice) return;        total_followed: 10,

            <Text>完成后返回:</Text>

            <Switch    

              checked={followConfig.returnToHome}

              onChange={(checked) => setFollowConfig(prev => ({ ...prev, returnToHome: checked }))}    try {        message: '成功完成关注'export const XiaohongshuFollowManager: React.FC<XiaohongshuFollowManagerProps> = ({

              className="ml-2"

            />      setIsFollowing(true);

          </div>

        </Col>      setStatusMessage('开始自动关注...');      });

      </Row>

    </Card>      setProgress(60);

  );

          } catch (error) {  importResults = [],} from 'antd';

  const renderDeviceInfo = () => (

    <Card title="设备信息" className="mb-4" size="small">      const options = {

      {selectedDevice ? (

        <div>        max_pages: followConfig.maxPages,      console.error('工作流程执行失败:', error);

          <Tag color="blue" icon={<AndroidOutlined />}>

            {selectedDevice.name}        follow_interval: followConfig.followInterval,

          </Tag>

          <Text className="ml-2">状态: </Text>        skip_existing: followConfig.skipExisting,      const errorMessage = error instanceof Error ? error.message : String(error);  selectedDevice,

          <Tag color={selectedDevice.status === 'connected' ? 'green' : 'red'}>

            {selectedDevice.status === 'connected' ? '已连接' : '未连接'}        return_to_home: followConfig.returnToHome

          </Tag>

        </div>      };      message.error(`执行失败: ${errorMessage}`);

      ) : (

        <Alert type="warning" message="请先选择设备" />      

      )}

    </Card>      const result = await XiaohongshuService.autoFollowContacts(      onError?.(errorMessage);  onWorkflowComplete,import React, { useState } from 'react';  SettingOutlined,  PlayCircleOutlined,

  );

        selectedDevice.id.toString(),

  const renderImportSummary = () => {

    if (!importResults || importResults.length === 0) return null;        options      setCurrentStep(0);

    

    const totalImported = importResults.reduce((sum, result) => sum + result.importedContacts, 0);      );

    

    return (          } finally {  onError,

      <Card title="导入结果" className="mb-4" size="small">

        <Text>      setFollowResult(result);

          已导入 <Text strong>{totalImported}</Text> 个联系人到 <Text strong>{importResults.length}</Text> 台设备

        </Text>      setCurrentStep(3);      setIsExecuting(false);

      </Card>

    );      setProgress(100);

  };

      setStatusMessage(`关注完成: 成功关注 ${result.total_followed} 个用户`);    }}) => {import { Device, VcfImportResult } from '../../types';

  const renderProgress = () => (

    <Card title="执行进度" className="mb-4" size="small">      

      <Progress 

        percent={progress}      message.success(`成功关注 ${result.total_followed} 个用户！`);  };

        status={isFollowing ? 'active' : 'normal'}

        className="mb-2"      onWorkflowComplete?.(result);

      />

      <Text>{statusMessage}</Text>        const [currentStep, setCurrentStep] = useState(0);

    </Card>

  );    } catch (error) {



  const renderResults = () => {      const errorMsg = `自动关注失败: ${error}`;  return (

    if (!followResult) return null;

          setStatusMessage(errorMsg);

    return (

      <Card title="关注结果" className="mb-4" size="small">      onError?.(errorMsg);    <div className="xiaohongshu-follow-manager">  const [isExecuting, setIsExecuting] = useState(false);  UserAddOutlined,  SettingOutlined,

        <Row gutter={16}>

          <Col span={6}>    } finally {

            <div className="text-center">

              <div className="text-2xl font-bold text-pink-600">{followResult.totalFollowed}</div>      setIsFollowing(false);      <Card 

              <div className="text-sm text-gray-600">关注用户</div>

            </div>    }

          </Col>

          <Col span={6}>  };        title={

            <div className="text-center">

              <div className="text-2xl font-bold text-purple-600">{followResult.pagesProcessed}</div>

              <div className="text-sm text-gray-600">处理页面</div>

            </div>  // 开始完整工作流程          <Space>

          </Col>

          <Col span={6}>  const startWorkflow = async () => {

            <div className="text-center">

              <div className="text-2xl font-bold text-blue-600">{Math.round(followResult.duration)}s</div>    setCurrentStep(0);            <HeartOutlined />  const handleStartWorkflow = async () => {const { Text } = Typography;

              <div className="text-sm text-gray-600">耗时</div>

            </div>    setProgress(0);

          </Col>

          <Col span={6}>    setFollowResult(null);            小红书自动关注

            <div className="text-center">

              <div className={`text-2xl font-bold ${followResult.success ? 'text-green-600' : 'text-red-600'}`}>    

                {followResult.success ? '成功' : '失败'}

              </div>    await checkAppStatus();          </Space>    if (!selectedDevice) {

              <div className="text-sm text-gray-600">状态</div>

            </div>    if (currentStep >= 1) {

          </Col>

        </Row>      await navigateToContacts();        }

        

        <Divider />      if (currentStep >= 2) {

        

        <div className="mb-3">        await executeAutoFollow();        extra={      message.error('请先选择要使用的设备');const { Step } = Steps;  WarningOutlined  UserAddOutlined,

          <Text>{followResult.message}</Text>

        </div>      }

        

        {followResult.details && followResult.details.length > 0 && (    }          <Space>

          <div>

            <Text strong>关注详情 ({followResult.details.length} 个用户):</Text>  };

            <div className="mt-2 max-h-40 overflow-y-auto">

              {followResult.details.map((detail, index) => (            <Tag color="blue">      onError?.('未选择设备');

                <div key={index} className="text-xs border rounded p-2 mb-1">

                  <div className="flex justify-between items-center">  const renderSteps = () => (

                    <span>位置: ({detail.userPosition.x}, {detail.userPosition.y})</span>

                    <Tag color={detail.followSuccess ? 'green' : 'red'} size="small">    <Steps current={currentStep} className="mb-6">              已导入通讯录: {importResults.filter(r => r.success).length}

                      {detail.followSuccess ? '成功' : '失败'}

                    </Tag>      <Step

                  </div>

                  {detail.error && (        title="检查应用"            </Tag>      return;

                    <div className="text-red-500 mt-1">{detail.error}</div>

                  )}        description="验证小红书应用状态"

                </div>

              ))}        icon={<AndroidOutlined />}            {selectedDevice && (

            </div>

          </div>      />

        )}

      </Card>      <Step              <Tag color="green">设备: {selectedDevice.name}</Tag>    }

    );

  };        title="导航页面"



  return (        description="前往通讯录页面"            )}

    <div className="xiaohongshu-follow-manager">

      <div className="mb-4">        icon={<ClockCircleOutlined />}

        <Title level={4}>

          <HeartOutlined className="mr-2" />      />          </Space>interface XiaohongshuFollowManagerProps {} from '@ant-design/icons';  WarningOutlined

          小红书自动关注

        </Title>      <Step

      </div>

        title="自动关注"        }

      {renderSteps()}

      {renderDeviceInfo()}        description="执行关注操作"

      {renderImportSummary()}

      {renderConfiguration()}        icon={<HeartOutlined />}      >    setIsExecuting(true);

      {renderProgress()}

      {renderResults()}      />



      <div className="text-center">      <Step        <Steps current={currentStep} className="mb-6">

        <Space>

          <Button        title="完成"

            type="primary"

            icon={<PlayCircleOutlined />}        description="关注流程完成"          <Step     setCurrentStep(1);  importResults?: VcfImportResult[];

            onClick={startWorkflow}

            loading={isFollowing}        icon={<CheckCircleOutlined />}

            disabled={!selectedDevice || selectedDevice.status !== 'connected'}

            size="large"      />            title="准备配置" 

          >

            {isFollowing ? '执行中...' : '开始自动关注'}    </Steps>

          </Button>

            );            description="配置关注参数和设备"

          {followResult && (

            <Button

              icon={<SettingOutlined />}

              onClick={() => {  const renderConfiguration = () => (            icon={<SettingOutlined />}

                setCurrentStep(0);

                setProgress(0);    <Card title="关注配置" className="mb-4" size="small">

                setFollowResult(null);

                setStatusMessage('');      <Row gutter={16}>          />    try {  selectedDevice?: Device;import {} from '@ant-design/icons';

              }}

            >        <Col span={6}>

              重新配置

            </Button>          <div className="mb-3">          <Step 

          )}

        </Space>            <Text>最大页数:</Text>

      </div>

    </div>            <InputNumber            title="执行关注"       // 模拟工作流程

  );

};              min={1}



export default XiaohongshuFollowManager;              max={10}            description="自动执行关注流程"

              value={followConfig.maxPages}

              onChange={(value) => setFollowConfig(prev => ({ ...prev, maxPages: value || 3 }))}            icon={<PlayCircleOutlined />}      await new Promise(resolve => setTimeout(resolve, 2000));  onWorkflowComplete?: (result: any) => void;

              className="w-full"

            />          />

          </div>

        </Col>          <Step       

        <Col span={6}>

          <div className="mb-3">            title="查看结果" 

            <Text>关注间隔(ms):</Text>

            <InputNumber            description="查看关注结果和统计"      setCurrentStep(2);  onError?: (error: string) => void;  Alert,import {

              min={1000}

              max={10000}            icon={<CheckCircleOutlined />}

              step={500}

              value={followConfig.followInterval}          />      message.success('小红书关注流程完成');

              onChange={(value) => setFollowConfig(prev => ({ ...prev, followInterval: value || 2000 }))}

              className="w-full"        </Steps>

            />

          </div>      }

        </Col>

        <Col span={6}>        {/* 步骤1: 准备配置 */}

          <div className="mb-3">

            <Text>跳过已关注:</Text>        {currentStep === 0 && (      onWorkflowComplete?.({

            <Switch

              checked={followConfig.skipExisting}          <div>

              onChange={(checked) => setFollowConfig(prev => ({ ...prev, skipExisting: checked }))}

              className="ml-2"            <Alert        success: true,  Badge,  Alert,

            />

          </div>              type="info"

        </Col>

        <Col span={6}>              message="小红书关注功能"        total_followed: 10,

          <div className="mb-3">

            <Text>完成后返回:</Text>              description="这个功能将根据导入的通讯录自动关注小红书好友"

            <Switch

              checked={followConfig.returnToHome}              showIcon        message: '成功完成关注'export const XiaohongshuFollowManager: React.FC<XiaohongshuFollowManagerProps> = ({

              onChange={(checked) => setFollowConfig(prev => ({ ...prev, returnToHome: checked }))}

              className="ml-2"              className="mb-4"

            />

          </div>            />      });

        </Col>

      </Row>            

    </Card>

  );            <div style={{ textAlign: 'center' }}>    } catch (error) {  importResults = [],  Button,  Badge,



  const renderDeviceInfo = () => (              <Button 

    <Card title="设备信息" className="mb-4" size="small">

      {selectedDevice ? (                type="primary"       console.error('工作流程执行失败:', error);

        <div>

          <Tag color="blue" icon={<AndroidOutlined />}>                size="large"

            {selectedDevice.name}

          </Tag>                icon={<PlayCircleOutlined />}      const errorMessage = error instanceof Error ? error.message : String(error);  selectedDevice,

          <Text className="ml-2">状态: </Text>

          <Tag color={selectedDevice.status === 'connected' ? 'green' : 'red'}>                onClick={handleStartWorkflow}

            {selectedDevice.status === 'connected' ? '已连接' : '未连接'}

          </Tag>                disabled={!selectedDevice || isExecuting}      message.error(`执行失败: ${errorMessage}`);

        </div>

      ) : (                loading={isExecuting}

        <Alert type="warning" message="请先选择设备" />

      )}              >      onError?.(errorMessage);  onWorkflowComplete,  Card,  Button,

    </Card>

  );                开始自动关注



  const renderImportSummary = () => {              </Button>      setCurrentStep(0);

    if (!importResults || importResults.length === 0) return null;

                  

    const totalImported = importResults.reduce((sum, result) => sum + result.importedContacts, 0);

                  {!selectedDevice && (    } finally {  onError,

    return (

      <Card title="导入结果" className="mb-4" size="small">                <div className="mt-4">

        <Text>

          已导入 <Text strong>{totalImported}</Text> 个联系人到 <Text strong>{importResults.length}</Text> 台设备                  <Alert       setIsExecuting(false);

        </Text>

      </Card>                    type="warning" 

    );

  };                    message="请先完成通讯录导入或手动选择设备"     }}) => {  Col,  Card,



  const renderProgress = () => (                    showIcon 

    <Card title="执行进度" className="mb-4" size="small">

      <Progress                     banner  };

        percent={progress}

        status={isFollowing ? 'active' : 'normal'}                  />

        className="mb-2"

      />                </div>  const [currentStep, setCurrentStep] = useState(0);

      <Text>{statusMessage}</Text>

    </Card>              )}

  );

            </div>  return (

  const renderResults = () => {

    if (!followResult) return null;          </div>

    

    return (        )}    <div className="xiaohongshu-follow-manager">  const [isExecuting, setIsExecuting] = useState(false);  Collapse,  Col,

      <Card title="关注结果" className="mb-4" size="small">

        <Row gutter={16}>

          <Col span={6}>

            <div className="text-center">        {/* 步骤2: 执行关注 */}      <Card 

              <div className="text-2xl font-bold text-pink-600">{followResult.totalFollowed}</div>

              <div className="text-sm text-gray-600">关注用户</div>        {currentStep === 1 && (

            </div>

          </Col>          <div style={{ textAlign: 'center', padding: '40px' }}>        title={

          <Col span={6}>

            <div className="text-center">            <Alert 

              <div className="text-2xl font-bold text-purple-600">{followResult.pagesProcessed}</div>

              <div className="text-sm text-gray-600">处理页面</div>              type="info"           <Space>

            </div>

          </Col>              message="正在执行自动关注流程，请勿操作手机" 

          <Col span={6}>

            <div className="text-center">              description="整个过程可能需要几分钟时间，请耐心等待"            <HeartOutlined />  const handleStartWorkflow = async () => {  Descriptions,  Collapse,

              <div className="text-2xl font-bold text-blue-600">{Math.round(followResult.duration)}s</div>

              <div className="text-sm text-gray-600">耗时</div>              showIcon 

            </div>

          </Col>            />            小红书自动关注

          <Col span={6}>

            <div className="text-center">          </div>

              <div className={`text-2xl font-bold ${followResult.success ? 'text-green-600' : 'text-red-600'}`}>

                {followResult.success ? '成功' : '失败'}        )}          </Space>    if (!selectedDevice) {

              </div>

              <div className="text-sm text-gray-600">状态</div>

            </div>

          </Col>        {/* 步骤3: 查看结果 */}        }

        </Row>

                {currentStep === 2 && (

        <Divider />

                  <div style={{ textAlign: 'center', padding: '40px' }}>        extra={      message.error('请先选择要使用的设备');  Form,  Descriptions,

        <div className="mb-3">

          <Text>{followResult.message}</Text>            <Alert 

        </div>

                      type="success"           <Space>

        {followResult.details && followResult.details.length > 0 && (

          <div>              message="小红书关注完成！" 

            <Text strong>关注详情 ({followResult.details.length} 个用户):</Text>

            <div className="mt-2 max-h-40 overflow-y-auto">              description="成功完成自动关注流程"            <Tag color="blue">      onError?.('未选择设备');

              {followResult.details.map((detail, index) => (

                <div key={index} className="text-xs border rounded p-2 mb-1">              showIcon 

                  <div className="flex justify-between items-center">

                    <span>位置: ({detail.userPosition.x}, {detail.userPosition.y})</span>            />              已导入通讯录: {importResults.filter(r => r.success).length}

                    <Tag color={detail.followSuccess ? 'green' : 'red'} size="small">

                      {detail.followSuccess ? '成功' : '失败'}            

                    </Tag>

                  </div>            <div className="mt-4">            </Tag>      return;  Input,  Divider,

                  {detail.error && (

                    <div className="text-red-500 mt-1">{detail.error}</div>              <Button 

                  )}

                </div>                type="primary"             {selectedDevice && (

              ))}

            </div>                onClick={() => setCurrentStep(0)}

          </div>

        )}              >              <Tag color="green">设备: {selectedDevice.name}</Tag>    }

      </Card>

    );                重新开始

  };

              </Button>            )}

  return (

    <div className="xiaohongshu-follow-manager">            </div>

      <div className="mb-4">

        <Title level={4}>          </div>          </Space>  InputNumber,  Form,

          <HeartOutlined className="mr-2" />

          小红书自动关注        )}

        </Title>

      </div>      </Card>        }



      {renderSteps()}    </div>

      {renderDeviceInfo()}

      {renderImportSummary()}  );      >    setIsExecuting(true);

      {renderConfiguration()}

      {renderProgress()}};

      {renderResults()}        <Steps current={currentStep} className="mb-6">



      <div className="text-center">          <Step     setCurrentStep(1);  message,  Input,

        <Space>

          <Button            title="准备配置" 

            type="primary"

            icon={<PlayCircleOutlined />}            description="配置关注参数和设备"

            onClick={startWorkflow}

            loading={isFollowing}            icon={<SettingOutlined />}

            disabled={!selectedDevice || selectedDevice.status !== 'connected'}

            size="large"          />    try {  Progress,  InputNumber,

          >

            {isFollowing ? '执行中...' : '开始自动关注'}          <Step 

          </Button>

                      title="执行关注"       // 模拟工作流程

          {followResult && (

            <Button            description="自动执行关注流程"

              icon={<SettingOutlined />}

              onClick={() => {            icon={<PlayCircleOutlined />}      await new Promise(resolve => setTimeout(resolve, 2000));  Row,  message,

                setCurrentStep(0);

                setProgress(0);          />

                setFollowResult(null);

                setStatusMessage('');          <Step       

              }}

            >            title="查看结果" 

              重新配置

            </Button>            description="查看关注结果和统计"      setCurrentStep(2);  Space,  Progress,

          )}

        </Space>            icon={<CheckCircleOutlined />}

      </div>

    </div>          />      message.success('小红书关注流程完成');

  );

};        </Steps>



export default XiaohongshuFollowManager;        Statistic,  Row,

        {/* 步骤1: 准备配置 */}

        {currentStep === 0 && (      onWorkflowComplete?.({

          <div>

            <Alert        success: true,  Steps,  Select,

              type="info"

              message="小红书关注功能"        total_followed: 10,

              description="这个功能将根据导入的通讯录自动关注小红书好友"

              showIcon        message: '成功完成关注'  Switch,  Space,

              className="mb-4"

            />      });

            

            <div style={{ textAlign: 'center' }}>    } catch (error) {  Table,  Statistic,

              <Button 

                type="primary"       console.error('工作流程执行失败:', error);

                size="large"

                icon={<PlayCircleOutlined />}      const errorMessage = error instanceof Error ? error.message : String(error);  Tag,  Steps,

                onClick={handleStartWorkflow}

                disabled={!selectedDevice || isExecuting}      message.error(`执行失败: ${errorMessage}`);

                loading={isExecuting}

              >      onError?.(errorMessage);  Timeline,  Switch,

                开始自动关注

              </Button>      setCurrentStep(0);

              

              {!selectedDevice && (    } finally {  Typography  Table,

                <div className="mt-4">

                  <Alert       setIsExecuting(false);

                    type="warning" 

                    message="请先完成通讯录导入或手动选择设备"     }} from 'antd';  Tag,

                    showIcon 

                    banner  };

                  />

                </div>import React, { useCallback, useEffect, useState } from 'react';  Timeline,

              )}

            </div>  return (

          </div>

        )}    <div className="xiaohongshu-follow-manager">import {  Typography



        {/* 步骤2: 执行关注 */}      <Card 

        {currentStep === 1 && (

          <div style={{ textAlign: 'center', padding: '40px' }}>        title={  AppStatusResult,} from 'antd';

            <Alert 

              type="info"           <Space>

              message="正在执行自动关注流程，请勿操作手机" 

              description="整个过程可能需要几分钟时间，请耐心等待"            <HeartOutlined />  CompleteWorkflowResult,import React, { useCallback, useEffect, useState } from 'react';

              showIcon 

            />            小红书自动关注

          </div>

        )}          </Space>  FollowDetail,import {



        {/* 步骤3: 查看结果 */}        }

        {currentStep === 2 && (

          <div style={{ textAlign: 'center', padding: '40px' }}>        extra={  XiaohongshuFollowOptions,  AppStatusResult,

            <Alert 

              type="success"           <Space>

              message="小红书关注完成！" 

              description="成功完成自动关注流程"            <Tag color="blue">  XiaohongshuService  CompleteWorkflowResult,

              showIcon 

            />              已导入通讯录: {importResults.filter(r => r.success).length}

            

            <div className="mt-4">            </Tag>} from '../../services/xiaohongshuService';  FollowDetail,

              <Button 

                type="primary"             {selectedDevice && (

                onClick={() => setCurrentStep(0)}

              >              <Tag color="green">设备: {selectedDevice.name}</Tag>import { Device, VcfImportResult } from '../../types';  XiaohongshuFollowOptions,

                重新开始

              </Button>            )}

            </div>

          </div>          </Space>  XiaohongshuService

        )}

      </Card>        }

    </div>

  );      >const { Text, Title } = Typography;} from '../../services/xiaohongshuService';

};
        <Steps current={currentStep} className="mb-6">

          <Step const { Step } = Steps;import { Device, VcfImportResult } from '../../types';

            title="准备配置" 

            description="配置关注参数和设备"const { Panel } = Collapse;

            icon={<SettingOutlined />}

          />const { Text, Title } = Typography;

          <Step 

            title="执行关注" // ===== 接口定义 =====const { Step } = Steps;

            description="自动执行关注流程"

            icon={<PlayCircleOutlined />}const { Panel } = Collapse;

          />

          <Step interface XiaohongshuFollowManagerProps {

            title="查看结果" 

            description="查看关注结果和统计"  // 通讯录导入联动相关// ===== 接口定义 =====

            icon={<CheckCircleOutlined />}

          />  importResults?: VcfImportResult[];

        </Steps>

  selectedDevice?: Device;interface XiaohongshuFollowManagerProps {

        {/* 步骤1: 准备配置 */}

        {currentStep === 0 && (  onWorkflowComplete?: (result: CompleteWorkflowResult) => void;  // 通讯录导入联动相关

          <div>

            <Alert  onError?: (error: string) => void;  importResults?: VcfImportResult[];

              type="info"

              message="小红书关注功能"    selectedDevice?: Device;

              description="这个功能将根据导入的通讯录自动关注小红书好友"

              showIcon  // 组件配置  onWorkflowComplete?: (result: CompleteWorkflowResult) => void;

              className="mb-4"

            />  autoStartAfterImport?: boolean;  onError?: (error: string) => void;

            

            <div style={{ textAlign: 'center' }}>  showAdvancedOptions?: boolean;  

              <Button 

                type="primary"   defaultOptions?: XiaohongshuFollowOptions;  // 组件配置

                size="large"

                icon={<PlayCircleOutlined />}}  autoStartAfterImport?: boolean;

                onClick={handleStartWorkflow}

                disabled={!selectedDevice || isExecuting}  showAdvancedOptions?: boolean;

                loading={isExecuting}

              >interface WorkflowStep {  defaultOptions?: XiaohongshuFollowOptions;

                开始自动关注

              </Button>  key: string;}

              

              {!selectedDevice && (  title: string;

                <div className="mt-4">

                  <Alert   description: string;interface WorkflowStep {

                    type="warning" 

                    message="请先完成通讯录导入或手动选择设备"   status: 'wait' | 'process' | 'finish' | 'error';  key: string;

                    showIcon 

                    banner  result?: any;  title: string;

                  />

                </div>  duration?: number;  description: string;

              )}

            </div>}  status: 'wait' | 'process' | 'finish' | 'error';

          </div>

        )}  result?: any;



        {/* 步骤2: 执行关注 */}// ===== 主组件 =====  duration?: number;

        {currentStep === 1 && (

          <div style={{ textAlign: 'center', padding: '40px' }}>}

            <Alert 

              type="info" export const XiaohongshuFollowManager: React.FC<XiaohongshuFollowManagerProps> = ({

              message="正在执行自动关注流程，请勿操作手机" 

              description="整个过程可能需要几分钟时间，请耐心等待"  importResults = [],// ===== 主组件 =====

              showIcon 

            />  selectedDevice,

          </div>

        )}  onWorkflowComplete,export const XiaohongshuFollowManager: React.FC<XiaohongshuFollowManagerProps> = ({



        {/* 步骤3: 查看结果 */}  onError,  importResults = [],

        {currentStep === 2 && (

          <div style={{ textAlign: 'center', padding: '40px' }}>  autoStartAfterImport = false,  selectedDevice,

            <Alert 

              type="success"   showAdvancedOptions = true,  onWorkflowComplete,

              message="小红书关注完成！" 

              description="成功完成自动关注流程"  defaultOptions,  onError,

              showIcon 

            />}) => {  autoStartAfterImport = false,

            

            <div className="mt-4">  // ===== 状态管理 =====  showAdvancedOptions = true,

              <Button 

                type="primary"   const [currentStep, setCurrentStep] = useState(0);  defaultOptions,

                onClick={() => setCurrentStep(0)}

              >  const [isExecuting, setIsExecuting] = useState(false);}) => {

                重新开始

              </Button>  const [appStatus, setAppStatus] = useState<AppStatusResult | null>(null);  // ===== 状态管理 =====

            </div>

          </div>  const [workflowResult, setWorkflowResult] = useState<CompleteWorkflowResult | null>(null);  const [currentStep, setCurrentStep] = useState(0);

        )}

      </Card>  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);  const [isExecuting, setIsExecuting] = useState(false);

    </div>

  );  const [executionProgress, setExecutionProgress] = useState(0);  const [appStatus, setAppStatus] = useState<AppStatusResult | null>(null);

};
    const [workflowResult, setWorkflowResult] = useState<CompleteWorkflowResult | null>(null);

  // 配置表单  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);

  const [form] = Form.useForm();  const [executionProgress, setExecutionProgress] = useState(0);

  const [followOptions, setFollowOptions] = useState<XiaohongshuFollowOptions>(  

    defaultOptions || XiaohongshuService.getRecommendedOptions('normal')  // 配置表单

  );  const [form] = Form.useForm();

  const [followOptions, setFollowOptions] = useState<XiaohongshuFollowOptions>(

  // 设备和统计信息    defaultOptions || XiaohongshuService.getRecommendedOptions('normal')

  const [deviceToUse, setDeviceToUse] = useState<Device | null>(selectedDevice || null);  );

  const [estimatedTime, setEstimatedTime] = useState(0);

  // 设备和统计信息

  // ===== 初始化和自动启动逻辑 =====  const [deviceToUse, setDeviceToUse] = useState<Device | null>(selectedDevice || null);

  useEffect(() => {  const [estimatedTime, setEstimatedTime] = useState(0);

    if (importResults.length > 0 && selectedDevice && autoStartAfterImport) {

      // 延迟3秒自动启动关注流程，给用户查看导入结果的时间  // ===== 主渲染 =====

      const timer = setTimeout(() => {  return (

        handleStartWorkflow();    <div className="xiaohongshu-follow-manager">

      }, 3000);      <Card 

      return () => clearTimeout(timer);        title={

    }          <Space>

  }, [importResults, selectedDevice, autoStartAfterImport]);            <HeartOutlined />

            小红书自动关注

  // 计算估算时间          </Space>

  useEffect(() => {        }

    const estimatedContacts = importResults.reduce((sum, result) => sum + result.importedContacts, 0);        extra={

    const contactsPerPage = Math.max(estimatedContacts / (followOptions.max_pages || 5), 10);          <Space>

    const time = XiaohongshuService.estimateFollowTime(followOptions, contactsPerPage);            <Badge 

    setEstimatedTime(time);              count={importResults.filter(r => r.success).length} 

  }, [followOptions, importResults]);              showZero={false}

              title="成功导入的设备数"

  // ===== 核心业务逻辑 =====            >

              <Tag color="blue">已导入通讯录</Tag>

  const initializeWorkflowSteps = useCallback(() => {            </Badge>

    const steps: WorkflowStep[] = [            {deviceToUse && (

      {              <Tag color="green">设备: {deviceToUse.name}</Tag>

        key: 'init',            )}

        title: '初始化服务',          </Space>

        description: '连接设备并初始化小红书自动化服务',        }

        status: 'wait',      >

      },        <div style={{ textAlign: 'center', padding: '40px' }}>

      {          <Text>组件正在开发中...</Text>

        key: 'check',        </div>

        title: '检查应用状态',      </Card>

        description: '验证小红书应用安装和运行状态',    </div>

        status: 'wait',  );

      },};

      {

        key: 'navigate',interface BackendFollowDetail {

        title: '导航到通讯录',    contact_name: string;

        description: '自动导航到小红书通讯录页面',    contact_phone: string;

        status: 'wait',    follow_status: FollowStatus;

      },    message: string;

      {    timestamp: string;

        key: 'follow',}

        title: '执行自动关注',

        description: '批量关注通讯录中的好友',interface FollowDetail {

        status: 'wait',    contactName: string;

      },    contactPhone: string;

    ];    followStatus: FollowStatus;

    setWorkflowSteps(steps);    message: string;

  }, []);    timestamp: string;

}

  const updateStepStatus = useCallback((stepKey: string, status: WorkflowStep['status'], result?: any, duration?: number) => {

    setWorkflowSteps(prev => prev.map(step => interface DeviceInfo {

      step.key === stepKey     id: string;

        ? { ...step, status, result, duration }    name: string;

        : step    status: 'online' | 'offline';

    ));}

  }, []);

const XiaohongshuFollowManager: React.FC<XiaohongshuFollowManagerProps> = ({

  const handleStartWorkflow = useCallback(async () => {    contacts,

    if (!deviceToUse) {    importResults,

      message.error('请先选择要使用的设备');    onFollowComplete,

      onError?.('未选择设备');    onError

      return;}) => {

    }    const [devices, setDevices] = useState<DeviceInfo[]>([]);

    const [maxFollows, setMaxFollows] = useState<number>(5);

    setIsExecuting(true);    const [isFollowing, setIsFollowing] = useState(false);

    setExecutionProgress(0);    const [isPaused, setIsPaused] = useState(false);

    setCurrentStep(1);    const [followProgress, setFollowProgress] = useState(0);

    initializeWorkflowSteps();    const [followDetails, setFollowDetails] = useState<FollowDetail[]>([]);

    const [currentContact, setCurrentContact] = useState<string>('');

    try {    const [autoConfigured, setAutoConfigured] = useState(false);

      const startTime = Date.now();

          // 辅助函数

      // 更新进度    const getStatusColor = (status: string) => {

      setExecutionProgress(10);        switch (status) {

      updateStepStatus('init', 'process');            case 'success': return 'green';

            case 'failed': return 'red';

      const result = await XiaohongshuService.executeCompleteWorkflow(            case 'pending': return 'blue';

        deviceToUse.id,            default: return 'orange';

        followOptions        }

      );    };



      const totalDuration = (Date.now() - startTime) / 1000;    const getStatusText = (status: string) => {

        switch (status) {

      // 更新各步骤状态            case 'success': return '成功';

      updateStepStatus('init', 'finish', { initialized: result.initialization }, 1);            case 'failed': return '失败';

      updateStepStatus('check', result.app_status.app_installed ? 'finish' : 'error', result.app_status, 2);            case 'pending': return '进行中';

      updateStepStatus('navigate', result.navigation.success ? 'finish' : 'error', result.navigation, 3);            default: return '跳过';

      updateStepStatus('follow', result.follow_result.success ? 'finish' : 'error', result.follow_result, totalDuration - 6);        }

    };

      setWorkflowResult(result);

      setExecutionProgress(100);    // 自动配置基于导入结果

      setCurrentStep(2);    const autoConfigureFromImportResults = () => {

        if (!importResults || importResults.length === 0 || autoConfigured) {

      // 分析结果            return;

      const analysis = XiaohongshuService.analyzeFollowResult(result.follow_result);        }

      

      if (analysis.isSuccess) {        // 找到成功的导入结果

        message.success(        const successfulImports = importResults.filter(result => result.success);

          `🎉 关注完成！成功关注了 ${result.follow_result.total_followed} 个好友，成功率 ${analysis.successRate.toFixed(1)}%`        if (successfulImports.length > 0) {

        );            // 计算总的成功导入联系人数量

      } else {            const totalImported = successfulImports.reduce((sum, result) => sum + result.importedContacts, 0);

        message.warning(            

          `⚠️ 关注部分成功，成功关注了 ${result.follow_result.total_followed} 个好友，成功率 ${analysis.successRate.toFixed(1)}%`            // 设置建议的关注数量（不超过导入数量，最多10个）

        );            const suggestedFollows = Math.min(totalImported, 10);

      }            setMaxFollows(suggestedFollows);

            setAutoConfigured(true);

      onWorkflowComplete?.(result);            

            message.info(`已根据导入结果自动配置：建议关注 ${suggestedFollows} 个好友（基于 ${totalImported} 个成功导入的联系人）`);

    } catch (error) {        }

      console.error('工作流程执行失败:', error);    };

      const errorMessage = error instanceof Error ? error.message : String(error);

          // 获取连接的设备列表

      message.error(`执行失败: ${errorMessage}`);    useEffect(() => {

      onError?.(errorMessage);        loadDevices();

          }, []);

      // 更新步骤状态为错误

      setWorkflowSteps(prev => prev.map(step =>     // 监听导入结果变化，自动配置关注参数

        step.status === 'process'     useEffect(() => {

          ? { ...step, status: 'error' as const, result: { error: errorMessage } }        autoConfigureFromImportResults();

          : step    }, [importResults, autoConfigured]);

      ));

          const loadDevices = async () => {

      setExecutionProgress(0);        try {

      setCurrentStep(0);            console.log('正在获取设备列表...');

    } finally {            // 调用Tauri API获取设备列表

      setIsExecuting(false);            const devices = await invoke('get_xiaohongshu_devices') as DeviceInfo[];

    }            

  }, [deviceToUse, followOptions, onWorkflowComplete, onError, initializeWorkflowSteps, updateStepStatus]);            console.log('获取的设备列表:', devices);

            setDevices(devices);

  const handleCheckAppStatus = useCallback(async () => {            

    if (!deviceToUse) {            if (devices.length === 0) {

      message.error('请先选择设备');                message.warning('未检测到任何设备，请确保设备已连接并开启USB调试');

      return;            } else {

    }                const onlineDevices = devices.filter(d => d.status === 'online');

                console.log('在线设备数量:', onlineDevices.length);

    try {                if (onlineDevices.length === 0) {

      await XiaohongshuService.initializeService(deviceToUse.id);                    message.warning('所有设备都离线，请确保设备已连接');

      const status = await XiaohongshuService.checkAppStatus();                }

      setAppStatus(status);            }

              } catch (error) {

      if (status.app_installed) {            console.error('获取设备列表失败:', error);

        message.success('小红书应用状态正常');            message.error('获取设备列表失败: ' + error);

      } else {        }

        message.warning('小红书应用未安装');    };

      }

    } catch (error) {    const startFollow = async () => {

      console.error('检查应用状态失败:', error);        console.log('开始关注按钮被点击');

      message.error('检查应用状态失败');        console.log('当前设备列表:', devices);

    }        console.log('当前联系人:', contacts);

  }, [deviceToUse]);        

        // 自动选择第一个在线设备

  const handleReset = useCallback(() => {        const onlineDevices = devices.filter(d => d.status === 'online');

    setCurrentStep(0);        console.log('在线设备:', onlineDevices);

    setWorkflowResult(null);        

    setWorkflowSteps([]);        if (onlineDevices.length === 0) {

    setExecutionProgress(0);            console.error('没有在线设备');

    setAppStatus(null);            message.error('没有可用的在线设备，请确保设备已连接');

  }, []);            return;

        }

  // ===== 渲染函数 =====

        const deviceToUse = onlineDevices[0];

  const renderDeviceAndImportSummary = () => (        console.log('将使用设备:', deviceToUse);

    <Card title="📋 通讯录导入摘要" className="mb-4">        

      <Row gutter={[16, 16]}>        if (contacts.length === 0) {

        <Col xs={24} sm={12} md={8}>            console.error('没有联系人');

          <Statistic             message.error('没有可关注的联系人');

            title="成功导入联系人"             return;

            value={importResults.reduce((sum, r) => sum + (r.success ? r.importedContacts : 0), 0)}        }

            suffix="个"

            valueStyle={{ color: '#52c41a' }}        Modal.confirm({

            prefix={<UserAddOutlined />}            title: '确认开始小红书关注',

          />            content: (

        </Col>                <div>

        <Col xs={24} sm={12} md={8}>                    <p>即将基于导入结果开始关注小红书通讯录好友：</p>

          <Statistic                     <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '6px', margin: '12px 0' }}>

            title="使用设备"                         <Text strong>导入摘要:</Text>

            value={deviceToUse?.name || '未选择'}                        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>

            valueStyle={{ color: '#1890ff' }}                            <li>成功导入: {importResults.filter(r => r.success).reduce((sum, r) => sum + r.importedContacts, 0)} 个联系人</li>

            prefix={<AndroidOutlined />}                            <li>成功设备: {importResults.filter(r => r.success).length} 个</li>

          />                            <li>使用设备: {deviceToUse.name}</li>

        </Col>                            <li>关注数量: {maxFollows} 个好友</li>

        <Col xs={24} sm={12} md={8}>                        </ul>

          <Statistic                     </div>

            title="预计关注时间"                     <Alert 

            value={XiaohongshuService.formatDuration(estimatedTime)}                        type="warning" 

            valueStyle={{ color: '#faad14' }}                        message="请确保小红书APP已打开并处于主页面" 

            prefix={<ClockCircleOutlined />}                        style={{ marginTop: 16 }}

          />                    />

        </Col>                </div>

      </Row>            ),

                  onOk: () => {

      {importResults.length > 0 && (                console.log('用户点击了确认按钮，开始执行关注');

        <div className="mt-4 p-3 bg-green-50 rounded">                executeFollow(deviceToUse.id);

          <Text strong className="text-green-800">✅ 通讯录导入已完成</Text>            },

          <div className="mt-2 text-sm text-green-600">            onCancel: () => {

            <ul className="mb-0 pl-4">                console.log('用户取消了关注操作');

              {importResults.filter(r => r.success).map((result, index) => (            },

                <li key={index}>            afterClose: () => {

                  成功导入 {result.importedContacts} 个联系人到设备                console.log('Modal 已关闭');

                </li>            }

              ))}        });

            </ul>    };

          </div>

        </div>    const executeFollow = async (deviceId: string) => {

      )}        console.log('🚀 开始执行关注，设备ID:', deviceId);

    </Card>        console.log('📊 关注参数:', {

  );            deviceId,

            maxFollows,

  const renderFollowConfiguration = () => (            contactsCount: contacts.length,

    <Card             importResultsCount: importResults.length

      title={        });

        <Space>        

          <SettingOutlined />        setIsFollowing(true);

          关注配置        setIsPaused(false);

        </Space>        setFollowProgress(0);

      }        setFollowDetails([]);

      extra={        setCurrentContact('');

        <Space>

          <Button         try {

            size="small"             // 调用Tauri API执行小红书关注

            onClick={() => setFollowOptions(XiaohongshuService.getRecommendedOptions('conservative'))}            const request = {

          >                device: deviceId,

            保守模式                max_follows: maxFollows,

          </Button>                contacts: contacts.slice(0, maxFollows).map(contact => ({

          <Button                     name: contact.name,

            size="small"                     phone: contact.phone

            onClick={() => setFollowOptions(XiaohongshuService.getRecommendedOptions('normal'))}                }))

          >            };

            标准模式

          </Button>            console.log('📤 发送关注请求到后端:', request);

          <Button             console.log('🔄 正在调用 xiaohongshu_follow_contacts...');

            size="small"             

            onClick={() => setFollowOptions(XiaohongshuService.getRecommendedOptions('aggressive'))}            const result = await invoke('xiaohongshu_follow_contacts', { request }) as FollowResult;

          >            

            积极模式            console.log('✅ 收到后端响应:', result);

          </Button>            console.log('📈 设置进度为 100%');

        </Space>            setFollowProgress(100);

      }            

      className="mb-4"            const mappedDetails = result.details.map(detail => ({

    >                contactName: detail.contact_name,

      <Form                contactPhone: detail.contact_phone,

        form={form}                followStatus: detail.follow_status,

        layout="vertical"                message: detail.message,

        initialValues={followOptions}                timestamp: detail.timestamp

        onValuesChange={(_, allValues) => setFollowOptions(allValues)}            }));

      >            console.log('📋 映射的关注详情:', mappedDetails);

        <Row gutter={16}>            setFollowDetails(mappedDetails);

          <Col xs={24} sm={12} md={6}>            

            <Form.Item             if (result.success) {

              label="最大页数"                 console.log('🎉 关注成功!');

              name="max_pages"                 message.success(`关注完成！成功关注 ${result.followed_count} 个好友`);

              tooltip="最多处理几页通讯录好友"                onFollowComplete(result);

            >            } else {

              <InputNumber min={1} max={20} />                console.log('❌ 关注失败:', result.message);

            </Form.Item>                message.error('关注失败: ' + result.message);

          </Col>                onError(result.message);

          <Col xs={24} sm={12} md={6}>            }

            <Form.Item         } catch (error) {

              label="关注间隔(毫秒)"             console.error('💥 关注过程中出错:', error);

              name="follow_interval"            console.error('错误详情:', {

              tooltip="每次关注操作之间的间隔时间"                error: String(error),

            >                type: typeof error

              <InputNumber min={1000} max={10000} step={500} />            });

            </Form.Item>            const errorMessage = error instanceof Error ? error.message : String(error);

          </Col>            message.error('关注过程中出现错误: ' + errorMessage);

          <Col xs={24} sm={12} md={6}>            onError('关注过程中出现错误: ' + errorMessage);

            <Form.Item         } finally {

              label="跳过已关注"             console.log('🏁 关注流程结束，重置状态');

              name="skip_existing"             setIsFollowing(false);

              valuePropName="checked"            setCurrentContact('');

              tooltip="自动跳过已经关注的用户"        }

            >    };

              <Switch />

            </Form.Item>    const stopFollow = async () => {

          </Col>        setIsFollowing(false);

          <Col xs={24} sm={12} md={6}>        setIsPaused(false);

            <Form.Item         message.info('已停止关注操作');

              label="完成后返回主页"     };

              name="return_to_home" 

              valuePropName="checked"    const pauseFollow = async () => {

              tooltip="关注完成后自动返回小红书主页"        setIsPaused(!isPaused);

            >        message.info(isPaused ? '已恢复关注' : '已暂停关注');

              <Switch />    };

            </Form.Item>

          </Col>    return (

        </Row>        <div>

            <Card title={

        {showAdvancedOptions && (                <Space>

          <Collapse ghost>                    <HeartOutlined style={{ color: '#ff4d4f' }} />

            <Panel header="高级选项" key="advanced">                    <span>小红书好友关注</span>

              <Row gutter={16}>                    {importResults.length > 0 && (

                <Col span={12}>                        <Tag color="green">

                  <Form.Item                             基于 {importResults.filter(r => r.success).reduce((sum, r) => sum + r.importedContacts, 0)} 个导入联系人

                    label="设备ID"                         </Tag>

                    tooltip="可以手动指定Android设备ID"                    )}

                  >                </Space>

                    <Input             }>

                      value={deviceToUse?.id}                 {/* 导入结果摘要 */}

                      placeholder="如: emulator-5554"                {importResults && importResults.length > 0 && (

                      onChange={(e) => {                    <Card title="导入结果摘要" size="small" style={{ marginBottom: 16 }}>

                        const customDevice: Device = {                        <Row gutter={16}>

                          id: e.target.value,                            {importResults.map((result, index) => (

                          name: `自定义设备 (${e.target.value})`,                                <Col span={8} key={`import-result-${index}-${result.totalContacts}`}>

                          status: 'unknown'                                    <Card size="small" style={{ 

                        };                                        border: result.success ? '1px solid #52c41a' : '1px solid #ff4d4f',

                        setDeviceToUse(customDevice);                                        backgroundColor: result.success ? '#f6ffed' : '#fff2f0'

                      }}                                    }}>

                    />                                        <Statistic

                  </Form.Item>                                            title={`设备 ${index + 1}`}

                </Col>                                            value={result.importedContacts}

                <Col span={12}>                                            suffix={`/ ${result.totalContacts}`}

                  <Space>                                            prefix={result.success ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}

                    <Button                                             valueStyle={{ 

                      icon={<AndroidOutlined />}                                                 color: result.success ? '#52c41a' : '#ff4d4f',

                      onClick={handleCheckAppStatus}                                                fontSize: '16px'

                      loading={false}                                            }}

                    >                                        />

                      检查应用状态                                        <Text type="secondary" style={{ fontSize: '12px' }}>

                    </Button>                                            {result.success ? '导入成功' : '导入失败'}

                    <Button onClick={handleReset}>重置</Button>                                        </Text>

                  </Space>                                    </Card>

                </Col>                                </Col>

              </Row>                            ))}

                        </Row>

              {appStatus && (                        <Alert

                <Alert                            style={{ marginTop: 12 }}

                  type={appStatus.app_installed ? 'success' : 'error'}                            type="info"

                  message={appStatus.message}                            message={`已自动配置关注数量为 ${maxFollows} 个好友，基于成功导入的联系人数量`}

                  description={                            showIcon

                    <div>                        />

                      <p>应用版本: {appStatus.app_version || '未知'}</p>                    </Card>

                      <p>包名: {appStatus.package_name || '未知'}</p>                )}

                    </div>

                  }                <Row gutter={24}>

                  showIcon                    <Col span={16}>

                  className="mt-2"                        {/* 整体操作控制 */}

                />                        <Card title="小红书关注控制" size="small" style={{ marginBottom: 16 }}>

              )}                            <Row gutter={16} style={{ marginBottom: 16 }}>

            </Panel>                                <Col span={8}>

          </Collapse>                                    <div style={{ textAlign: 'center' }}>

        )}                                        <Statistic

      </Form>                                            title="待关注联系人"

    </Card>                                            value={maxFollows}

  );                                            prefix={<UserAddOutlined />}

                                            valueStyle={{ color: '#1890ff' }}

  const renderExecutionProgress = () => (                                        />

    <Card                                     </div>

      title={                                </Col>

        <Space>                                <Col span={8}>

          <LoadingOutlined spin={isExecuting} />                                    <div style={{ textAlign: 'center' }}>

          执行进度                                        <Statistic

        </Space>                                            title="已关注成功"

      }                                            value={followDetails.filter(d => d.followStatus === 'success').length}

      className="mb-4"                                            prefix={<CheckCircleOutlined />}

    >                                            valueStyle={{ color: '#52c41a' }}

      <Progress                                         />

        percent={executionProgress}                                     </div>

        status={isExecuting ? 'active' : 'normal'}                                </Col>

        strokeColor={{                                <Col span={8}>

          '0%': '#108ee9',                                    <div style={{ textAlign: 'center' }}>

          '100%': '#87d068',                                        <Statistic

        }}                                            title="关注进度"

        className="mb-4"                                            value={Math.round((followDetails.filter(d => d.followStatus === 'success').length / maxFollows) * 100)}

      />                                            suffix="%"

                                                  valueStyle={{ color: '#fa8c16' }}

      <Steps current={workflowSteps.findIndex(step => step.status === 'process')} size="small">                                        />

        {workflowSteps.map(step => (                                    </div>

          <Step                                </Col>

            key={step.key}                            </Row>

            title={step.title}

            description={step.description}                            <div style={{ textAlign: 'center', marginBottom: 16 }}>

            status={step.status}                                <Space size="large">

            icon={                                    <Button

              step.status === 'process' ? <LoadingOutlined /> :                                        type="primary"

              step.status === 'finish' ? <CheckCircleOutlined /> :                                        size="large"

              step.status === 'error' ? <WarningOutlined /> : undefined                                        icon={<PlayCircleOutlined />}

            }                                        onClick={() => {

          />                                            console.log('🎯 用户点击了"开始小红书关注"按钮');

        ))}                                            console.log('🔍 当前状态检查:', {

      </Steps>                                                isFollowing,

                                                contactsLength: contacts.length,

      {workflowSteps.some(step => step.result) && (                                                devicesLength: devices.length,

        <Timeline className="mt-4">                                                onlineDevicesCount: devices.filter(d => d.status === 'online').length

          {workflowSteps                                            });

            .filter(step => step.result)                                            startFollow();

            .map(step => (                                        }}

              <Timeline.Item                                        disabled={isFollowing || contacts.length === 0}

                key={step.key}                                        loading={isFollowing && !isPaused}

                color={step.status === 'finish' ? 'green' : step.status === 'error' ? 'red' : 'blue'}                                    >

                dot={                                        开始小红书关注

                  step.status === 'finish' ? <CheckCircleOutlined /> :                                    </Button>

                  step.status === 'error' ? <WarningOutlined /> :                                    <Button

                  <LoadingOutlined />                                        icon={isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}

                }                                        onClick={pauseFollow}

              >                                        disabled={!isFollowing}

                <div>                                        size="large"

                  <Text strong>{step.title}</Text>                                    >

                  {step.duration && <Text type="secondary" className="ml-2">({step.duration}秒)</Text>}                                        {isPaused ? '恢复' : '暂停'}

                  <div className="mt-1 text-sm">                                    </Button>

                    {step.status === 'error' ? (                                    <Button

                      <Text type="danger">{step.result?.error || '执行失败'}</Text>                                        danger

                    ) : (                                        icon={<StopOutlined />}

                      <Text type="secondary">{step.description}</Text>                                        onClick={stopFollow}

                    )}                                        disabled={!isFollowing}

                  </div>                                        size="large"

                </div>                                    >

              </Timeline.Item>                                        停止

            ))}                                    </Button>

        </Timeline>                                    

      )}                                    {/* 调试按钮 */}

    </Card>                                    <Button

  );                                        type="dashed"

                                        size="small"

  const renderExecutionResults = () => {                                        onClick={async () => {

    if (!workflowResult) return null;                                            console.log('🧪 测试后端连接');

                                            try {

    const { follow_result } = workflowResult;                                                const testRequest = {

    const analysis = XiaohongshuService.analyzeFollowResult(follow_result);                                                    device: 'test-device',

                                                    max_follows: 1,

    return (                                                    contacts: [{ name: '测试', phone: '12345678901' }]

      <Card                                                 };

        title={                                                console.log('📤 发送测试请求:', testRequest);

          <Space>                                                const result = await invoke('xiaohongshu_follow_contacts', { request: testRequest });

            <HeartOutlined />                                                console.log('✅ 测试响应:', result);

            关注结果                                                message.info('后端连接测试完成，请查看控制台');

          </Space>                                            } catch (error) {

        }                                                console.error('❌ 测试失败:', error);

        className="mb-4"                                                message.error('后端连接测试失败: ' + error);

      >                                            }

        <Row gutter={[16, 16]} className="mb-4">                                        }}

          <Col xs={24} sm={8}>                                    >

            <Statistic                                         测试后端

              title="成功关注"                                     </Button>

              value={follow_result.total_followed}                                </Space>

              suffix="个好友"                            </div>

              valueStyle={{ color: '#52c41a' }}

            />                            {/* 关注进度 */}

          </Col>                            {isFollowing && (

          <Col xs={24} sm={8}>                                <div style={{ marginTop: 16 }}>

            <Statistic                                     <Progress 

              title="处理页数"                                         percent={followProgress} 

              value={follow_result.pages_processed}                                        status={isPaused ? 'exception' : 'active'}

              suffix="页"                                        strokeColor={{

              valueStyle={{ color: '#1890ff' }}                                            '0%': '#108ee9',

            />                                            '100%': '#87d068',

          </Col>                                        }}

          <Col xs={24} sm={8}>                                    />

            <Statistic                                     {currentContact && (

              title="执行时长"                                         <Text type="secondary" style={{ marginTop: 8, display: 'block', textAlign: 'center' }}>

              value={XiaohongshuService.formatDuration(follow_result.duration)}                                            正在关注: {currentContact}

              valueStyle={{ color: '#faad14' }}                                        </Text>

            />                                    )}

          </Col>                                </div>

        </Row>                            )}

                        </Card>

        <Descriptions title="详细统计" bordered size="small" column={2}>

          <Descriptions.Item label="成功率">                        {/* 按设备分组显示联系人列表 */}

            <Badge                         <Card title="联系人列表（按设备分组）" size="small">

              color={analysis.successRate > 80 ? 'green' : analysis.successRate > 50 ? 'orange' : 'red'}                            {importResults.map((result, deviceIndex) => {

              text={`${analysis.successRate.toFixed(1)}%`}                                if (!result.success) return null;

            />                                

          </Descriptions.Item>                                const deviceContacts = contacts.slice(

          <Descriptions.Item label="总尝试次数">                                    deviceIndex * Math.ceil(contacts.length / importResults.filter(r => r.success).length),

            {analysis.totalAttempts}                                    (deviceIndex + 1) * Math.ceil(contacts.length / importResults.filter(r => r.success).length)

          </Descriptions.Item>                                );

          <Descriptions.Item label="执行状态">

            <Tag color={follow_result.success ? 'success' : 'error'}>                                return (

              {follow_result.success ? '成功' : '失败'}                                    <div key={`device-${result.totalContacts}-${result.importedContacts}-${deviceIndex}`} style={{ marginBottom: 16 }}>

            </Tag>                                        <Card 

          </Descriptions.Item>                                            size="small" 

          <Descriptions.Item label="结果消息">                                            title={

            {follow_result.message}                                                <Space>

          </Descriptions.Item>                                                    <MobileOutlined />

        </Descriptions>                                                    <Text strong>设备 {deviceIndex + 1}</Text>

                                                    <Tag color="blue">{deviceContacts.length} 个联系人</Tag>

        {analysis.errorSummary.length > 0 && (                                                    <Tag color="green">导入成功 {result.importedContacts}</Tag>

          <div className="mt-4">                                                </Space>

            <Text strong>错误汇总:</Text>                                            }

            <ul className="mt-2">                                        >

              {analysis.errorSummary.map((error, index) => (                                            <Table

                <li key={index} className="text-red-600">{error}</li>                                                columns={[

              ))}                                                    {

            </ul>                                                        title: '姓名',

          </div>                                                        dataIndex: 'name',

        )}                                                        key: 'name',

                                                        render: (text: string) => <Text strong>{text}</Text>

        {follow_result.details.length > 0 && (                                                    },

          <div className="mt-4">                                                    {

            <Text strong>操作详情:</Text>                                                        title: '电话',

            <Table                                                        dataIndex: 'phone',

              dataSource={follow_result.details}                                                        key: 'phone',

              rowKey={(record, index) => index || 0}                                                        render: (text: string) => <Text code>{text}</Text>

              size="small"                                                    },

              pagination={{ pageSize: 10 }}                                                    {

              className="mt-2"                                                        title: '关注状态',

              columns={[                                                        key: 'status',

                {                                                        render: (_text: any, record: Contact) => {

                  title: '位置',                                                            const detail = followDetails.find(d => d.contactPhone === record.phone);

                  dataIndex: 'user_position',                                                            if (!detail) {

                  render: (position: [number, number]) => `(${position[0]}, ${position[1]})`,                                                                return <Tag color="default">待关注</Tag>;

                  width: 120,                                                            }

                },                                                            

                {                                                            const statusConfig = {

                  title: '关注前状态',                                                                pending: { color: 'processing', text: '关注中' },

                  dataIndex: 'button_text_before',                                                                success: { color: 'success', text: '已关注' },

                  ellipsis: true,                                                                failed: { color: 'error', text: '失败' },

                },                                                                skipped: { color: 'warning', text: '跳过' }

                {                                                            };

                  title: '关注后状态',                                                            

                  dataIndex: 'button_text_after',                                                            const config = statusConfig[detail.followStatus];

                  ellipsis: true,                                                            return <Tag color={config.color}>{config.text}</Tag>;

                },                                                        }

                {                                                    }

                  title: '结果',                                                ]}

                  dataIndex: 'follow_success',                                                dataSource={deviceContacts}

                  render: (success: boolean) => (                                                rowKey="phone"

                    <Tag color={success ? 'success' : 'error'}>                                                size="small"

                      {success ? '成功' : '失败'}                                                pagination={false}

                    </Tag>                                                scroll={{ y: 200 }}

                  ),                                            />

                  width: 80,                                        </Card>

                },                                    </div>

                {                                );

                  title: '错误',                            })}

                  dataIndex: 'error',                        </Card>

                  ellipsis: true,                    </Col>

                  render: (error: string) => error && <Text type="danger">{error}</Text>,

                },                    <Col span={8}>

              ]}                        {/* 操作指南 */}

            />                        <Card title="操作指南" size="small" style={{ marginBottom: 16 }}>

          </div>                            <Paragraph style={{ fontSize: '13px' }}>

        )}                                <Title level={5} style={{ fontSize: '14px', margin: '8px 0 4px' }}>

      </Card>                                    关注流程：

    );                                </Title>

  };                                <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '6px', margin: '8px 0' }}>

                                    <Text strong>✅ 通讯录导入已完成</Text><br/>

  // ===== 主渲染 =====                                    <Text type="secondary">• 成功设备: {importResults.filter(r => r.success).length} 个</Text><br/>

                                    <Text type="secondary">• 导入联系人: {importResults.filter(r => r.success).reduce((sum, r) => sum + r.importedContacts, 0)} 个</Text><br/>

  return (                                    <Text type="secondary">• 关注数量: {maxFollows} 个好友</Text>

    <div className="xiaohongshu-follow-manager">                                </div>

      <Card                                 

        title={                                <ol style={{ paddingLeft: '16px', margin: '8px 0', fontSize: '12px' }}>

          <Space>                                    <li>确保小红书APP已打开并处于主页面</li>

            <HeartOutlined />                                    <li>点击"开始小红书关注"自动执行</li>

            小红书自动关注                                    <li>系统将按设备分组进行关注</li>

          </Space>                                    <li>可随时暂停或停止关注过程</li>

        }                                </ol>

        extra={                                

          <Space>                                <Alert 

            <Badge                                     type="info" 

              count={importResults.filter(r => r.success).length}                                     message="智能配置" 

              showZero={false}                                    description={`系统已根据导入结果自动配置关注参数，无需手动设置`}

              title="成功导入的设备数"                                    showIcon 

            >                                    style={{ fontSize: '12px', marginTop: 12 }}

              <Tag color="blue">已导入通讯录</Tag>                                />

            </Badge>                            </Paragraph>

            {deviceToUse && (                        </Card>

              <Tag color="green">设备: {deviceToUse.name}</Tag>

            )}                        {/* 设备状态 */}

          </Space>                        <Card title="设备状态" size="small" style={{ marginBottom: 16 }}>

        }                            <div style={{ maxHeight: '150px', overflow: 'auto' }}>

      >                                {devices.length > 0 ? (

        <Steps current={currentStep} className="mb-6">                                    devices.map(device => (

          <Step                                         <div key={device.id} style={{ 

            title="准备配置"                                             padding: '8px', 

            description="配置关注参数和设备"                                            margin: '4px 0', 

            icon={<ControlOutlined />}                                            border: '1px solid #d9d9d9', 

          />                                            borderRadius: '4px',

          <Step                                             background: device.status === 'online' ? '#f6ffed' : '#fff2f0'

            title="执行关注"                                         }}>

            description="自动执行关注流程"                                            <Space>

            icon={<PlayCircleOutlined />}                                                <MobileOutlined />

          />                                                <Text strong style={{ fontSize: '12px' }}>{device.name}</Text>

          <Step                                                 <Tag 

            title="查看结果"                                                     color={device.status === 'online' ? 'green' : 'red'}

            description="查看关注结果和统计"                                                    style={{ fontSize: '10px' }}

            icon={<CheckCircleOutlined />}                                                >

          />                                                    {device.status}

        </Steps>                                                </Tag>

                                            </Space>

        {/* 步骤1: 准备配置 */}                                        </div>

        {currentStep === 0 && (                                    ))

          <div>                                ) : (

            {renderDeviceAndImportSummary()}                                    <Text type="secondary" style={{ fontSize: '12px' }}>

            {renderFollowConfiguration()}                                        正在检测设备...

                                                </Text>

            <div className="text-center">                                )}

              <Space size="large">                            </div>

                <Button                             <Button 

                  type="primary"                                 type="link" 

                  size="large"                                size="small" 

                  icon={<PlayCircleOutlined />}                                onClick={loadDevices}

                  onClick={handleStartWorkflow}                                style={{ padding: 0, marginTop: 8 }}

                  disabled={!deviceToUse || isExecuting}                            >

                  loading={isExecuting}                                刷新设备列表

                >                            </Button>

                  开始自动关注                        </Card>

                </Button>

                                        {/* 关注详情 */}

                {!deviceToUse && (                        {followDetails.length > 0 && (

                  <Alert                             <Card title="关注详情" size="small">

                    type="warning"                                 <List

                    message="请先完成通讯录导入或手动选择设备"                                     size="small"

                    showIcon                                     dataSource={followDetails}

                    banner                                    renderItem={(item, index) => (

                  />                                        <List.Item key={index}>

                )}                                            <List.Item.Meta

              </Space>                                                title={

            </div>                                                    <Space>

          </div>                                                        <Text strong style={{ fontSize: '12px' }}>

        )}                                                            {item.contactName}

                                                        </Text>

        {/* 步骤2: 执行关注 */}                                                        <Tag 

        {currentStep === 1 && (                                                            color={getStatusColor(item.followStatus)}

          <div>                                                            style={{ fontSize: '10px' }}

            {renderExecutionProgress()}                                                        >

                                                                        {getStatusText(item.followStatus)}

            <div className="text-center">                                                        </Tag>

              <Alert                                                     </Space>

                type="info"                                                 }

                message="正在执行自动关注流程，请勿操作手机"                                                 description={

                description="整个过程可能需要几分钟时间，请耐心等待"                                                    <Text type="secondary" style={{ fontSize: '11px' }}>

                showIcon                                                         {item.message}

                banner                                                    </Text>

              />                                                }

            </div>                                            />

          </div>                                        </List.Item>

        )}                                    )}

                                    style={{ maxHeight: '200px', overflow: 'auto' }}

        {/* 步骤3: 查看结果 */}                                />

        {currentStep === 2 && (                            </Card>

          <div>                        )}

            {renderExecutionResults()}                    </Col>

                            </Row>

            <div className="text-center">            </Card>

              <Space size="large">        </div>

                <Button     );

                  size="large"};

                  onClick={() => setCurrentStep(0)}

                >export default XiaohongshuFollowManager;
                  重新配置
                </Button>
                <Button 
                  type="primary" 
                  size="large"
                  onClick={handleReset}
                >
                  完成
                </Button>
              </Space>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};