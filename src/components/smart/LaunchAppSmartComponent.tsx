import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Select,
  InputNumber,
  Switch,
  Button,
  Space,
  Tag,
  Alert,
  Divider,
  Typography,
  Row,
  Col,
  message
} from 'antd';
import {
  RocketOutlined,
  AppstoreOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { SmartAppSelector } from './SmartAppSelector';
import { smartAppService } from '../../services/smartAppService';
import type { AppInfo, LaunchAppComponentParams } from '../../types/smartComponents';
import { LAUNCH_APP_COMPONENT } from '../../types/smartComponents';

const { Option } = Select;
const { Text, Title } = Typography;

export interface LaunchAppSmartComponentProps {
  deviceId: string;
  value?: LaunchAppComponentParams;
  onChange?: (value: LaunchAppComponentParams) => void;
  onPreview?: () => void;
  onExecute?: (params: LaunchAppComponentParams) => Promise<boolean>;
}

export const LaunchAppSmartComponent: React.FC<LaunchAppSmartComponentProps> = ({
  deviceId,
  value,
  onChange,
  onPreview,
  onExecute
}) => {
  const [form] = Form.useForm<LaunchAppComponentParams>();
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [selectedApp, setSelectedApp] = useState<AppInfo | null>(null);
  const [executing, setExecuting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    time?: number;
  } | null>(null);

  // 初始化表单值
  useEffect(() => {
    if (value) {
      form.setFieldsValue(value);
      if (value.selected_app) {
        setSelectedApp(value.selected_app);
      }
    } else {
      // 设置默认值
      const defaultValues: LaunchAppComponentParams = {
        app_selection_method: 'manual',
        wait_after_launch: 3000,
        verify_launch: true,
        fallback_method: 'retry',
        max_retry_count: 3
      };
      form.setFieldsValue(defaultValues);
      onChange?.(defaultValues);
    }
  }, [value, form, onChange]);

  // 处理表单变化
  const handleFormChange = () => {
    const formValues = form.getFieldsValue();
    const newParams: LaunchAppComponentParams = {
      ...formValues,
      selected_app: selectedApp || undefined,
      package_name: selectedApp?.package_name
    };
    onChange?.(newParams);
  };

  // 处理应用选择
  const handleAppSelect = (app: AppInfo) => {
    setSelectedApp(app);
    form.setFieldsValue({ selected_app: app });
    const formValues = form.getFieldsValue();
    const newParams: LaunchAppComponentParams = {
      ...formValues,
      selected_app: app,
      package_name: app.package_name
    };
    onChange?.(newParams);
    setTestResult(null); // 清除之前的测试结果
  };

  // 测试启动应用
  const handleTestLaunch = async () => {
    if (!selectedApp) {
      message.warning('请先选择要启动的应用');
      return;
    }

    setExecuting(true);
    setTestResult(null);

    try {
      const startTime = Date.now();
      const result = await smartAppService.launchDeviceApp(deviceId, selectedApp.package_name);
      const endTime = Date.now();
      
      setTestResult({
        success: result.success,
        message: result.message,
        time: endTime - startTime
      });

      if (result.success) {
        message.success(`应用启动成功: ${selectedApp.app_name}`);
      } else {
        message.error(`应用启动失败: ${result.message}`);
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : '未知错误'
      });
      message.error('测试启动失败');
    } finally {
      setExecuting(false);
    }
  };

  // 执行组件操作
  const handleExecute = async () => {
    const formValues = form.getFieldsValue();
    const params: LaunchAppComponentParams = {
      ...formValues,
      selected_app: selectedApp || undefined,
      package_name: selectedApp?.package_name
    };

    if (onExecute) {
      setExecuting(true);
      try {
        const success = await onExecute(params);
        if (success) {
          message.success('应用启动操作执行成功');
        } else {
          message.error('应用启动操作执行失败');
        }
      } catch (error) {
        message.error('执行失败');
      } finally {
        setExecuting(false);
      }
    }
  };

  return (
    <Card
      title={
        <Space>
          <RocketOutlined style={{ color: LAUNCH_APP_COMPONENT.color }} />
          <Title level={5} style={{ margin: 0 }}>
            {LAUNCH_APP_COMPONENT.name}
          </Title>
          <Tag color={LAUNCH_APP_COMPONENT.color}>
            {LAUNCH_APP_COMPONENT.category}
          </Tag>
        </Space>
      }
      extra={
        <Space>
          {onPreview && (
            <Button size="small" onClick={onPreview}>
              预览
            </Button>
          )}
          <Button 
            type="primary" 
            size="small"
            loading={executing}
            onClick={handleExecute}
            disabled={!selectedApp}
          >
            执行测试
          </Button>
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      <Alert
        message={LAUNCH_APP_COMPONENT.description}
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form
        form={form}
        layout="vertical"
        onChange={handleFormChange}
      >
        {/* 应用选择方式 */}
        <Form.Item
          name="app_selection_method"
          label="应用选择方式"
          tooltip="选择如何确定要启动的应用"
        >
          <Select>
            <Option value="manual">手动选择</Option>
            <Option value="auto_detect">自动检测</Option>
            <Option value="popular">热门应用</Option>
          </Select>
        </Form.Item>

        {/* 应用选择器 */}
        <Form.Item label="选择应用" required>
          <div>
            <Button
              icon={<AppstoreOutlined />}
              onClick={() => setSelectorVisible(true)}
              style={{ marginBottom: 8 }}
            >
              {selectedApp ? '更换应用' : '选择应用'}
            </Button>
            
            {selectedApp && (
              <div style={{ 
                padding: '8px 12px', 
                border: '1px solid #d9d9d9',
                borderRadius: '6px',
                backgroundColor: '#fafafa'
              }}>
                <Row align="middle">
                  <Col span={18}>
                    <Space>
                      <AppstoreOutlined style={{ color: '#1890ff' }} />
                      <div>
                        <Text strong>{selectedApp.app_name}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {selectedApp.package_name}
                        </Text>
                      </div>
                    </Space>
                  </Col>
                  <Col span={6} style={{ textAlign: 'right' }}>
                    <Button 
                      size="small"
                      type="link"
                      loading={executing}
                      onClick={handleTestLaunch}
                    >
                      测试启动
                    </Button>
                  </Col>
                </Row>
              </div>
            )}
          </div>
        </Form.Item>

        <Divider orientation="left">启动配置</Divider>

        <Row gutter={16}>
          {/* 启动后等待时间 */}
          <Col span={12}>
            <Form.Item
              name="wait_after_launch"
              label="启动后等待时间 (毫秒)"
              tooltip="启动应用后等待的时间，确保应用完全加载"
            >
              <InputNumber
                min={0}
                max={30000}
                step={500}
                style={{ width: '100%' }}
                formatter={(value) => `${value}ms`}
                parser={(value) => value?.replace('ms', '') as any}
              />
            </Form.Item>
          </Col>

          {/* 验证启动成功 */}
          <Col span={12}>
            <Form.Item
              name="verify_launch"
              label="验证启动成功"
              valuePropName="checked"
              tooltip="启动后检查应用是否成功运行"
            >
              <Switch />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">错误处理</Divider>

        <Row gutter={16}>
          {/* 失败后操作 */}
          <Col span={12}>
            <Form.Item
              name="fallback_method"
              label="失败后操作"
              tooltip="应用启动失败时的处理方式"
            >
              <Select>
                <Option value="retry">重试启动</Option>
                <Option value="ignore">忽略继续</Option>
                <Option value="error">报错停止</Option>
              </Select>
            </Form.Item>
          </Col>

          {/* 最大重试次数 */}
          <Col span={12}>
            <Form.Item
              name="max_retry_count"
              label="最大重试次数"
              tooltip="启动失败时的最大重试次数"
            >
              <InputNumber
                min={1}
                max={10}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* 测试结果显示 */}
        {testResult && (
          <Alert
            message={testResult.success ? '启动成功' : '启动失败'}
            description={
              <div>
                <Text>{testResult.message}</Text>
                {testResult.time && (
                  <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                    耗时: {testResult.time}ms
                  </Text>
                )}
              </div>
            }
            type={testResult.success ? 'success' : 'error'}
            icon={testResult.success ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
            style={{ marginTop: 16 }}
            closable
            onClose={() => setTestResult(null)}
          />
        )}
      </Form>

      {/* 应用选择器 */}
      <SmartAppSelector
        visible={selectorVisible}
        onClose={() => setSelectorVisible(false)}
        onSelect={handleAppSelect}
        deviceId={deviceId}
        selectedApp={selectedApp}
      />
    </Card>
  );
};