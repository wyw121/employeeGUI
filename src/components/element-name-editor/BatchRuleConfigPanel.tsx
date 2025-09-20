import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  Tooltip,
  Typography,
  Row,
  Col,
  Alert,
  message
} from 'antd';
import {
  BulbOutlined,
  InfoCircleOutlined,
  PlayCircleOutlined,
  StopOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { FieldMatchingController } from './FieldMatchingController';

const { Text } = Typography;

interface SimplifiedRule {
  textCondition: string;
  batchExecution: {
    mode: 'first' | 'all' | 'sequential' | 'parallel';
    delayMs?: number;
    maxRetries?: number;
  };
}

interface BatchRuleConfigPanelProps {
  onChange?: (rule: SimplifiedRule) => void;
  showTesting?: boolean;
  elementType?: string; // 当前编辑的元素类型
  elementData?: any; // 当前元素的实际数据
  stepName?: string; // 步骤名称，用于显示上下文
}

const BatchRuleConfigPanel: React.FC<BatchRuleConfigPanelProps> = ({
  onChange,
  showTesting = true,
  elementType = 'follow_button',
  elementData = null,
  stepName = '当前步骤'
}) => {
  const [form] = Form.useForm();
  const [rule, setRule] = useState<SimplifiedRule>({
    textCondition: '',
    batchExecution: {
      mode: 'first',
      delayMs: 1000,
      maxRetries: 3
    }
  });

  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    matchedCount?: number;
  } | null>(null);

  // 监听表单变化
  const handleFormChange = (changedValues: any, allValues: any) => {
    const updatedRule = {
      textCondition: allValues.textCondition || '',
      batchExecution: {
        mode: allValues.batchMode || 'first',
        delayMs: allValues.delayMs || 1000,
        maxRetries: allValues.maxRetries || 3
      }
    };
    setRule(updatedRule);
    onChange?.(updatedRule);
  };

  // 执行测试
  const handleTest = async () => {
    try {
      setIsTestRunning(true);
      setTestResult(null);
      
      // 模拟测试过程
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockResult = {
        success: Math.random() > 0.3,
        message: Math.random() > 0.5 ? '测试成功' : '未找到匹配元素',
        matchedCount: Math.floor(Math.random() * 5) + 1
      };
      
      setTestResult(mockResult);
      
      if (mockResult.success) {
        message.success('规则测试成功');
      } else {
        message.warning('规则测试失败');
      }
    } catch (error) {
      console.error('测试失败:', error);
      setTestResult({
        success: false,
        message: '测试过程中发生错误'
      });
      message.error('测试过程中发生错误');
    } finally {
      setIsTestRunning(false);
    }
  };

  const renderConditionConfig = () => (
    <Card size="small" title={
      <Space>
        <BulbOutlined />
        {stepName} - 元素匹配配置
      </Space>
    }>
      <Form.Item
        name="textCondition"
        label="文本条件"
        rules={[{ required: true, message: '请输入匹配条件' }]}
        help={`针对${stepName}中的元素进行文本匹配`}
      >
        <Input
          placeholder={`输入${elementType === 'follow_button' ? '关注按钮' : elementType === 'username' ? '用户名' : '元素'}的文本内容`}
          suffix={
            <Tooltip title="配置元素匹配的基本条件">
              <InfoCircleOutlined />
            </Tooltip>
          }
        />
      </Form.Item>

      {/* 字段匹配配置 */}
      <div style={{ marginTop: '16px' }}>
        <Text strong>字段匹配配置:</Text>
        <div style={{ marginTop: '8px' }}>
          <FieldMatchingController 
            elementType={elementType}
            elementData={elementData}
          />
        </div>
      </div>

      {/* 条件预览 */}
      <div style={{ marginTop: '12px' }}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          💡 匹配预览：在{stepName}中查找包含 "<Text code>{rule.textCondition || '(未设置)'}</Text>" 的{elementType === 'follow_button' ? '关注按钮' : elementType === 'username' ? '用户名' : '元素'}
        </Text>
      </div>
    </Card>
  );

  return (
    <div style={{ padding: '16px 0' }}>
      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleFormChange}
        initialValues={{
          textCondition: rule.textCondition,
          batchMode: rule.batchExecution.mode,
          delayMs: rule.batchExecution.delayMs,
          maxRetries: rule.batchExecution.maxRetries
        }}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {renderConditionConfig()}

          {/* 测试区域 */}
          {showTesting && (
            <Card size="small" title={
              <Space>
                <PlayCircleOutlined />
                规则测试
              </Space>
            }>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Row gutter={16} align="middle">
                  <Col>
                    <Button
                      type="primary"
                      icon={isTestRunning ? <StopOutlined /> : <PlayCircleOutlined />}
                      loading={isTestRunning}
                      onClick={handleTest}
                      disabled={!rule.textCondition}
                    >
                      {isTestRunning ? '测试中...' : '开始测试'}
                    </Button>
                  </Col>
                  <Col>
                    <Text type="secondary">
                      {rule.textCondition ? '点击开始测试匹配规则' : '请先配置匹配条件'}
                    </Text>
                  </Col>
                </Row>

                {testResult && (
                  <Alert
                    message={testResult.success ? '测试成功' : '测试失败'}
                    description={
                      <div>
                        <Text>{testResult.message}</Text>
                        {testResult.matchedCount && (
                          <div style={{ marginTop: '4px' }}>
                            <Text type="secondary">
                              找到 {testResult.matchedCount} 个匹配元素
                            </Text>
                          </div>
                        )}
                      </div>
                    }
                    type={testResult.success ? 'success' : 'warning'}
                    showIcon
                    icon={testResult.success ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
                  />
                )}
              </Space>
            </Card>
          )}
        </Space>
      </Form>
    </div>
  );
};

export default BatchRuleConfigPanel;