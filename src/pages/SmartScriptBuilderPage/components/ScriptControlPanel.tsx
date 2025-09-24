import React from "react";
import {
  Card,
  Button,
  Space,
  Form,
  InputNumber,
  Row,
  Col,
  Typography,
  Collapse,
  Divider,
  Switch,
  Tooltip,
} from "antd";
import {
  PlayCircleOutlined,
  SettingOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import TestResultsDisplay from "../../../components/TestResultsDisplay";
import { ScriptBuilderIntegration } from "../../../modules/smart-script-management/components/ScriptBuilderIntegration";
import type { ExtendedSmartScriptStep } from "../../../types/loopScript";
import type {
  ExecutorConfig,
  SmartExecutionResult,
} from "../../../types/execution";
import { useSingleStepTest } from "../../../hooks/useSingleStepTest";

const { Title } = Typography;
const { Panel } = Collapse;

interface ScriptControlPanelProps {
  steps: ExtendedSmartScriptStep[];
  executorConfig: ExecutorConfig;
  setExecutorConfig: (config: ExecutorConfig) => void;
  executionResult: SmartExecutionResult | null;
  isExecuting: boolean;
  currentDeviceId: string;
  onExecuteScript: () => void;
  onLoadScript: (script: any) => void;
  onUpdateSteps: (steps: any[]) => void;
  onUpdateConfig: (config: any) => void;
}

const ScriptControlPanel: React.FC<ScriptControlPanelProps> = ({
  steps,
  executorConfig,
  setExecutorConfig,
  executionResult,
  isExecuting,
  currentDeviceId,
  onExecuteScript,
  onLoadScript,
  onUpdateSteps,
  onUpdateConfig,
}) => {
  const { getAllTestResults } = useSingleStepTest();
  const testResults = getAllTestResults();

  return (
    <Card>
      <Title level={4}>脚本控制中心</Title>
      <Divider />

      <Space direction="vertical" style={{ width: "100%" }}>
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={onExecuteScript}
          loading={isExecuting}
          disabled={!currentDeviceId || steps.length === 0}
          block
        >
          {isExecuting ? "正在执行脚本..." : "执行脚本"}
        </Button>

        <ScriptBuilderIntegration
          steps={steps}
          executorConfig={executorConfig}
          onLoadScript={onLoadScript}
          onUpdateSteps={onUpdateSteps}
          onUpdateConfig={onUpdateConfig}
        />
      </Space>

      <Divider />

      <Collapse>
        <Panel header="执行器配置" key="1" extra={<SettingOutlined />}>
          <Form layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="默认超时(ms)">
                  <InputNumber
                    value={executorConfig.default_timeout_ms}
                    onChange={(value) =>
                      setExecutorConfig({
                        ...executorConfig,
                        default_timeout_ms: value || 10000,
                      })
                    }
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="默认重试次数">
                  <InputNumber
                    value={executorConfig.default_retry_count}
                    onChange={(value) =>
                      setExecutorConfig({
                        ...executorConfig,
                        default_retry_count: value || 3,
                      })
                    }
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              label="页面识别"
              tooltip="启用后，执行器会尝试识别当前页面状态，以提高鲁棒性。"
            >
              <Switch
                checked={executorConfig.page_recognition_enabled}
                onChange={(checked) =>
                  setExecutorConfig({
                    ...executorConfig,
                    page_recognition_enabled: checked,
                  })
                }
              />
            </Form.Item>
            <Form.Item
              label="自动验证"
              tooltip="操作执行后，自动验证结果是否符合预期。"
            >
              <Switch
                checked={executorConfig.auto_verification_enabled}
                onChange={(checked) =>
                  setExecutorConfig({
                    ...executorConfig,
                    auto_verification_enabled: checked,
                  })
                }
              />
            </Form.Item>
            <Form.Item
              label="智能恢复"
              tooltip="执行失败时，尝试使用备用策略或回退机制进行恢复。"
            >
              <Switch
                checked={executorConfig.smart_recovery_enabled}
                onChange={(checked) =>
                  setExecutorConfig({
                    ...executorConfig,
                    smart_recovery_enabled: checked,
                  })
                }
              />
            </Form.Item>
            <Form.Item
              label="详细日志"
              tooltip="记录详细的执行日志，方便调试。"
            >
              <Switch
                checked={executorConfig.detailed_logging}
                onChange={(checked) =>
                  setExecutorConfig({
                    ...executorConfig,
                    detailed_logging: checked,
                  })
                }
              />
            </Form.Item>
          </Form>
        </Panel>
      </Collapse>

      <Divider />

      {executionResult && (
        <TestResultsDisplay />
      )}
    </Card>
  );
};

export default ScriptControlPanel;
