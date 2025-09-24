import React from 'react';
import {
  Card,
  Button,
  Space,
  Row,
  Col,
  Typography,
  Divider,
  message,
  Collapse,
  Tag,
} from 'antd';
import {
  ThunderboltOutlined,
  SaveOutlined,
  EyeOutlined,
  BulbOutlined,
  RobotOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';
import TestResultsDisplay from '../../../../components/TestResultsDisplay';
import { ScriptBuilderIntegration } from '../../../../modules/smart-script-management/components/ScriptBuilderIntegration';
import { ExtendedSmartScriptStep } from '../../../../types/loopScript';
import { SmartExecutionResult, ExecutorConfig } from '../../../../types/smartScript';

const { Panel } = Collapse;

interface ScriptControlPanelProps {
  steps: ExtendedSmartScriptStep[];
  executorConfig: ExecutorConfig;
  isExecuting: boolean;
  executionResult: SmartExecutionResult | null;
  isScriptValid: boolean;
  currentDeviceId: string;
  setSteps: React.Dispatch<React.SetStateAction<ExtendedSmartScriptStep[]>>;
  setExecutorConfig: React.Dispatch<React.SetStateAction<ExecutorConfig>>;
  handleExecuteScript: () => Promise<void>;
  handleLoadScriptFromManager: (loadedScript: any) => void;
  setShowQualityPanel: (show: boolean) => void;
}

const ScriptControlPanel: React.FC<ScriptControlPanelProps> = (props) => {
  const {
    steps,
    executorConfig,
    isExecuting,
    executionResult,
    isScriptValid,
    currentDeviceId,
    setSteps,
    setExecutorConfig,
    handleExecuteScript,
    handleLoadScriptFromManager,
    setShowQualityPanel,
  } = props;

  const handleSaveScript = async () => {
    if (steps.length === 0) {
      message.warning('请先添加脚本步骤');
      return;
    }
    try {
      const scriptData = {
        id: `script_${Date.now()}`,
        name: `智能脚本_${new Date().toLocaleString()}`,
        description: `包含 ${steps.length} 个步骤的自动化脚本`,
        version: '1.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        author: '用户',
        category: '通用',
        tags: ['智能脚本', '自动化'],
        steps: steps.map((step, index) => ({
          id: step.id || `step_${index + 1}`,
          step_type: step.step_type,
          name: step.name || step.description,
          description: step.description,
          parameters: step.parameters || {},
          enabled: step.enabled !== false,
          order: index,
        })),
        config: {
          continue_on_error: executorConfig.smart_recovery_enabled,
          auto_verification_enabled: executorConfig.auto_verification_enabled,
          smart_recovery_enabled: executorConfig.smart_recovery_enabled,
          detailed_logging: executorConfig.detailed_logging,
        },
        metadata: {},
      };
      const savedScriptId = await invoke('save_smart_script', { script: scriptData });
      message.success(`脚本保存成功！ID: ${savedScriptId}`);
    } catch (error) {
      console.error('❌ 保存脚本失败:', error);
      message.error(`保存脚本失败: ${error}`);
    }
  };

  return (
    <Space direction="vertical" size="middle" className="w-full">
      {/* 脚本控制 */}
      <Card title="🎮 智能脚本控制">
        <Space direction="vertical" className="w-full">
          <Button
            type="primary"
            block
            size="large"
            icon={<ThunderboltOutlined />}
            loading={isExecuting}
            disabled={steps.length === 0}
            onClick={handleExecuteScript}
          >
            {isExecuting ? '智能执行中...' : '执行智能脚本'}
          </Button>

          <Row gutter={8}>
            <Col span={24}>
              <ScriptBuilderIntegration
                steps={steps}
                executorConfig={executorConfig}
                onLoadScript={handleLoadScriptFromManager}
                onUpdateSteps={setSteps}
                onUpdateConfig={setExecutorConfig}
              />
            </Col>
          </Row>

          <Divider style={{ margin: '12px 0' }} />

          <Row gutter={8}>
            <Col span={12}>
              <Button
                block
                icon={<SaveOutlined />}
                disabled={steps.length === 0}
                onClick={handleSaveScript}
              >
                快速保存 (旧版)
              </Button>
            </Col>
            <Col span={12}>
              <Button block icon={<EyeOutlined />}>
                预览脚本
              </Button>
            </Col>
          </Row>

          {executionResult && (
            <div className="mt-4 p-3 bg-gray-50 rounded">
              <div className="text-sm font-medium mb-2">执行结果</div>
              <div className="space-y-1 text-xs">
                <div>
                  状态:{' '}
                  <Tag color={executionResult.success ? 'green' : 'red'}>
                    {executionResult.success ? '成功' : '失败'}
                  </Tag>
                </div>
                <div>总步骤: {executionResult.total_steps}</div>
                <div>执行成功: {executionResult.executed_steps}</div>
                <div>执行失败: {executionResult.failed_steps}</div>
                <div>耗时: {executionResult.duration_ms}ms</div>
              </div>
            </div>
          )}
        </Space>
      </Card>

      {/* 单步测试结果 */}
      <TestResultsDisplay />

      {/* 智能功能说明 */}
      <Card
        title={
          <>
            <BulbOutlined className="mr-2" />
            智能功能特性
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <div className="flex items-center space-x-2">
            <CheckCircleOutlined className="text-green-500" />
            <span>页面状态智能识别</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircleOutlined className="text-green-500" />
            <span>UI元素动态定位</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircleOutlined className="text-green-500" />
            <span>操作结果自动验证</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircleOutlined className="text-green-500" />
            <span>智能重试和恢复</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircleOutlined className="text-green-500" />
            <span>复杂工作流程支持</span>
          </div>
        </div>
      </Card>

      {/* 操作类型说明 */}
      <Card title="🏷️ 操作类型分类">
        <Collapse size="small">
          <Panel header="基础操作" key="basic">
            <div className="text-xs space-y-1">
              <div>• 基础点击 - 固定坐标点击</div>
              <div>• 滑动操作 - 屏幕滑动</div>
              <div>• 文本输入 - 键盘输入</div>
              <div>• 等待操作 - 时间延迟</div>
            </div>
          </Panel>
          <Panel header="智能操作" key="smart">
            <div className="text-xs space-y-1">
              <div>• 智能点击 - AI识别元素</div>
              <div>• 智能查找 - 动态元素定位</div>
              <div>• 页面识别 - 状态智能判断</div>
              <div>• 智能导航 - 复杂路径规划</div>
            </div>
          </Panel>
          <Panel header="验证操作" key="verification">
            <div className="text-xs space-y-1">
              <div>• 操作验证 - 结果确认</div>
              <div>• 状态等待 - 页面切换等待</div>
              <div>• 数据提取 - 信息采集</div>
            </div>
          </Panel>
        </Collapse>
      </Card>

      {/* 调试和测试区域 */}
      <Card title="🧪 调试测试">
        <Space direction="vertical" className="w-full">
          <Button
            size="small"
            type="default"
            block
            icon={<BulbOutlined />}
            onClick={() => {
              message.info('元素名称映射测试功能暂时禁用');
            }}
          >
            测试元素名称映射
          </Button>
          <Button
            size="small"
            type="default"
            block
            icon={<RobotOutlined />}
            onClick={() => {
              console.log('🧪 运行智能步骤生成器测试...');
              // testSmartStepGenerator();
              // testVariousCases();
            }}
          >
            测试智能步骤生成
          </Button>

          <Button
            size="small"
            type={isScriptValid ? 'default' : 'primary'}
            danger={!isScriptValid}
            block
            icon={
              isScriptValid ? (
                <CheckCircleOutlined />
              ) : (
                <WarningOutlined />
              )
            }
            onClick={() => setShowQualityPanel(true)}
            disabled={steps.length === 0}
          >
            {isScriptValid ? '质量检查通过' : '需要质量修复'} ({steps.length} 步骤)
          </Button>
        </Space>
      </Card>
    </Space>
  );
};

export default ScriptControlPanel;
