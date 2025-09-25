import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Select,
  Button,
  Space,
  Divider,
  Alert,
  Tag,
  Input,
  Radio,
  Spin,
  message,
  Typography
} from 'antd';
import {
  AimOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';
import { UniversalUIService, type UniversalClickResult } from '../../api/universalUIAPI';

const { Title, Text } = Typography;
const { Option } = Select;

// 导航栏配置接口
interface NavigationConfig {
  position_type: 'bottom' | 'top' | 'side' | 'floating';
  position_ratio: {
    x_start: number;
    x_end: number;
    y_start: number;
    y_end: number;
  };
  button_patterns: string[];
  target_button: string;
  click_action: 'single_tap' | 'double_tap' | 'long_press';
  description?: string;
}

// 预设导航栏配置
const PRESET_NAVIGATION_CONFIGS: { [key: string]: NavigationConfig } = {
  '小红书_底部导航': {
    position_type: 'bottom',
    position_ratio: { x_start: 0.0, x_end: 1.0, y_start: 0.93, y_end: 1.0 },
    button_patterns: ['首页', '市集', '发布', '消息', '我'],
    target_button: '我',
    click_action: 'single_tap',
    description: '小红书应用底部导航栏，包含5个主要按钮'
  },
  '微信_底部导航': {
    position_type: 'bottom',
    position_ratio: { x_start: 0.0, x_end: 1.0, y_start: 0.9, y_end: 1.0 },
    button_patterns: ['微信', '通讯录', '发现', '我'],
    target_button: '我',
    click_action: 'single_tap',
    description: '微信应用底部导航栏，包含4个主要按钮'
  },
  '抖音_底部导航': {
    position_type: 'bottom',
    position_ratio: { x_start: 0.0, x_end: 1.0, y_start: 0.92, y_end: 1.0 },
    button_patterns: ['首页', '朋友', '发布', '消息', '我'],
    target_button: '我',
    click_action: 'single_tap',
    description: '抖音应用底部导航栏，包含5个主要按钮'
  },
  '自定义配置': {
    position_type: 'bottom',
    position_ratio: { x_start: 0.0, x_end: 1.0, y_start: 0.9, y_end: 1.0 },
    button_patterns: [],
    target_button: '',
    click_action: 'single_tap',
    description: '用户自定义的导航栏配置'
  }
};

// 检测结果接口
interface DetectedElement {
  text: string;
  position: [number, number];
}

interface NavigationFinderResult {
  success: boolean;
  message: string;
  found_elements: DetectedElement[];
  target_element?: DetectedElement;
  navigation_area?: {
    bounds: string;
    position: string;
  };
}

interface SmartNavigationFinderProps {
  deviceId?: string;
  onStepGenerated?: (step: any) => void; // 用于生成智能脚本步骤
}

// 测试模式类型
type TestMode = 'app_specific' | 'direct_adb';

// 测试模式配置
const TEST_MODE_CONFIG = {
  app_specific: {
    label: '指定应用模式',
    description: '根据选择的应用进行检测，会验证应用状态',
    icon: '📱',
    color: 'blue' as const
  },
  direct_adb: {
    label: '直接ADB模式', 
    description: '直接在当前界面查找，不管是什么应用',
    icon: '⚡',
    color: 'green' as const
  }
};

const SmartNavigationFinder: React.FC<SmartNavigationFinderProps> = ({
  deviceId,
  onStepGenerated
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NavigationFinderResult | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>('小红书_底部导航');
  const [customMode, setCustomMode] = useState(false);
  const [buttonInputMode, setButtonInputMode] = useState<'preset' | 'custom'>('preset');
  const [testMode, setTestMode] = useState<TestMode>('app_specific'); // 新增：测试模式状态

  // 初始化表单
  useEffect(() => {
    if (selectedPreset && selectedPreset !== '自定义配置') {
      const config = PRESET_NAVIGATION_CONFIGS[selectedPreset];
      form.setFieldsValue({
        position_type: config.position_type,
        target_button: config.target_button,
        click_action: config.click_action
      });
      setCustomMode(false);
    } else {
      setCustomMode(true);
    }
  }, [selectedPreset]);

  // 获取当前配置
  const getCurrentConfig = (): NavigationConfig => {
    const values = form.getFieldsValue();
    if (selectedPreset !== '自定义配置') {
      const presetConfig = PRESET_NAVIGATION_CONFIGS[selectedPreset];
      return {
        ...presetConfig,
        target_button: values.target_button || presetConfig.target_button,
        click_action: values.click_action || presetConfig.click_action
      };
    } else {
      return {
        position_type: values.position_type || 'bottom',
        position_ratio: {
          x_start: values.x_start || 0.0,
          x_end: values.x_end || 1.0,
          y_start: values.y_start || 0.9,
          y_end: values.y_end || 1.0
        },
        button_patterns: values.button_patterns?.split(',').map((s: string) => s.trim()) || [],
        target_button: values.target_button || '',
        click_action: values.click_action || 'single_tap'
      };
    }
  };

  // 执行智能导航查找
  const handleSmartFind = async () => {
    console.log('🔧 执行智能导航查找 - deviceId:', deviceId);
    
    // 如果没有提供deviceId，使用默认的模拟器ID进行测试
    const testDeviceId = deviceId || 'emulator-5554';
    
    if (!testDeviceId) {
      message.error('请先选择设备');
      return;
    }

    try {
      setLoading(true);
      const config = getCurrentConfig();
      
      // 从预设名称中提取应用名称 (如 "小红书_底部导航" -> "小红书")
      const appName = selectedPreset !== '自定义配置' 
        ? selectedPreset.split('_')[0] 
        : undefined;
      
      // 构建Universal UI参数
      const navigationParams = {
        navigation_type: config.position_type,
        target_button: config.target_button,
        click_action: config.click_action,
        // 根据测试模式决定是否传递app_name
        app_name: testMode === 'app_specific' ? appName : undefined,
        position_ratio: config.position_ratio
      };
      
      console.log(`🔧 Universal UI 智能导航查找 [${TEST_MODE_CONFIG[testMode].label}]:`, {
        deviceId: testDeviceId,
        navigationParams
      });
      
      // 使用Universal UI API
  const result = await UniversalUIService.executeUIClick(testDeviceId, navigationParams);

      console.log('Universal UI result:', result);
      
      // 转换结果格式
      // 将 position 字符串解析为元组 [x, y]
      const toTuple = (pos?: string): [number, number] | undefined => {
        if (!pos) return undefined;
        const m = pos.match(/\(([-\d.]+),\s*([-\d.]+)\)/);
        if (m) return [Number(m[1]), Number(m[2])];
        const parts = pos.split(/[ ,]+/).map(Number).filter(n => !Number.isNaN(n));
        return parts.length >= 2 ? [parts[0], parts[1]] : undefined;
      };

      const navigationResult: NavigationFinderResult = {
        success: result.element_found,
        message: result.element_found 
          ? `✅ [${result.mode}] 成功找到目标按钮 "${navigationParams.target_button}"` 
          : (result.error_message || '未找到目标按钮'),
        found_elements: result.found_element ? [{
          text: result.found_element.text,
          position: toTuple(result.found_element.position) || [0, 0]
        }] : [],
        target_element: result.found_element ? {
          text: result.found_element.text,
          position: toTuple(result.found_element.position) || [0, 0]
        } : undefined
      };

      setResult(navigationResult);

      if (result.element_found) {
        message.success(`✅ 成功检测到导航元素！(${result.mode}, ${result.execution_time_ms}ms)`);
      } else {
        message.warning(result.error_message || '未找到目标按钮');
      }
    } catch (error) {
      console.error('智能检测失败:', error);
      message.error(`检测失败: ${error}`);
      setResult({
        success: false,
        message: `错误: ${error}`,
        found_elements: []
      });
    } finally {
      setLoading(false);
    }
  };

  // 点击检测到的元素
  const handleClickElement = async (element: DetectedElement) => {
    if (!deviceId) {
      message.error('请先选择设备');
      return;
    }

    try {
      setLoading(true);
      const config = getCurrentConfig();
      
      const result = await invoke('click_detected_element', {
        deviceId,
        element,
        clickType: config.click_action
      });

      console.log('Click result:', result);
      message.success(`成功点击元素: ${element.text}`);
    } catch (error) {
      console.error('Click element error:', error);
      message.error(`点击失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 生成智能脚本步骤
  const handleGenerateStep = () => {
    if (!result?.target_element) {
      message.error('请先成功检测到目标元素');
      return;
    }

    const config = getCurrentConfig();
    const step = {
      type: 'smart_navigation_action',
      name: `导航栏操作: ${config.target_button}`,
      description: `在${selectedPreset}中查找并点击"${config.target_button}"按钮`,
      config: {
        navigation_type: config.position_type,
        target_button: config.target_button,
        click_action: config.click_action,
        preset: selectedPreset !== '自定义配置' ? selectedPreset : null
      },
      element: result.target_element
    };

    if (onStepGenerated) {
      onStepGenerated(step);
      message.success('已生成智能脚本步骤！');
    }
  };

  // 获取预设按钮列表
  const getPresetButtons = () => {
    if (selectedPreset === '自定义配置') return [];
    return PRESET_NAVIGATION_CONFIGS[selectedPreset]?.button_patterns || [];
  };

  return (
    <Card
      title={
        <Space>
          <AimOutlined />
          <span>智能导航栏查找器</span>
        </Space>
      }
      extra={
        <Tag color="blue">
          <SettingOutlined /> 导航栏专用
        </Tag>
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          position_type: 'bottom',
          target_button: '我',
          click_action: 'single_tap'
        }}
      >
        {/* 预设配置选择 */}
        <Form.Item label="预设配置">
          <Select
            value={selectedPreset}
            onChange={setSelectedPreset}
            placeholder="选择应用预设或自定义"
          >
            {Object.entries(PRESET_NAVIGATION_CONFIGS).map(([key, config]) => (
              <Option key={key} value={key}>
                <Space>
                  <span>{key}</span>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {config.description}
                  </Text>
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* 导航栏位置类型 */}
        <Form.Item name="position_type" label="导航栏位置">
          <Radio.Group disabled={!customMode}>
            <Radio.Button value="bottom">底部导航</Radio.Button>
            <Radio.Button value="top">顶部导航</Radio.Button>
            <Radio.Button value="side">侧边导航</Radio.Button>
            <Radio.Button value="floating">悬浮导航</Radio.Button>
          </Radio.Group>
        </Form.Item>

        {/* 自定义位置配置 */}
        {customMode && (
          <Form.Item label="导航区域位置比例">
            <Space>
              <Form.Item name="x_start" label="X起始" style={{ marginBottom: 0 }}>
                <Input placeholder="0.0" style={{ width: 80 }} />
              </Form.Item>
              <Form.Item name="x_end" label="X结束" style={{ marginBottom: 0 }}>
                <Input placeholder="1.0" style={{ width: 80 }} />
              </Form.Item>
              <Form.Item name="y_start" label="Y起始" style={{ marginBottom: 0 }}>
                <Input placeholder="0.9" style={{ width: 80 }} />
              </Form.Item>
              <Form.Item name="y_end" label="Y结束" style={{ marginBottom: 0 }}>
                <Input placeholder="1.0" style={{ width: 80 }} />
              </Form.Item>
            </Space>
          </Form.Item>
        )}

        {/* 目标按钮选择 */}
        <Form.Item label="目标按钮">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Radio.Group
              value={buttonInputMode}
              onChange={(e) => setButtonInputMode(e.target.value)}
            >
              <Radio value="preset">预设按钮</Radio>
              <Radio value="custom">手动输入</Radio>
            </Radio.Group>

            {buttonInputMode === 'preset' ? (
              <Form.Item name="target_button" style={{ marginBottom: 0 }}>
                <Select placeholder="选择目标按钮">
                  {getPresetButtons().map(button => (
                    <Option key={button} value={button}>{button}</Option>
                  ))}
                </Select>
              </Form.Item>
            ) : (
              <Form.Item name="target_button" style={{ marginBottom: 0 }}>
                <Input placeholder="输入按钮文字，如：我的" />
              </Form.Item>
            )}
          </Space>
        </Form.Item>

        {/* 点击动作 */}
        <Form.Item name="click_action" label="点击动作">
          <Radio.Group>
            <Radio.Button value="single_tap">单击</Radio.Button>
            <Radio.Button value="double_tap">双击</Radio.Button>
            <Radio.Button value="long_press">长按</Radio.Button>
          </Radio.Group>
        </Form.Item>

        {/* 自定义按钮模式 */}
        {customMode && (
          <Form.Item name="button_patterns" label="按钮列表">
            <Input.TextArea
              placeholder="输入按钮文字列表，用逗号分隔，如：首页,发现,消息,我"
              rows={2}
            />
          </Form.Item>
        )}

        {/* 测试模式选择 */}
        <Form.Item label="测试模式">
          <div style={{ marginBottom: 16 }}>
            <Radio.Group 
              value={testMode} 
              onChange={(e) => setTestMode(e.target.value)}
              style={{ width: '100%' }}
            >
              {Object.entries(TEST_MODE_CONFIG).map(([key, config]) => (
                <Radio.Button 
                  key={key} 
                  value={key}
                  style={{ marginRight: 8, marginBottom: 8 }}
                >
                  <Space size="small">
                    <span>{config.icon}</span>
                    <span>{config.label}</span>
                  </Space>
                </Radio.Button>
              ))}
            </Radio.Group>
            
            {/* 模式说明 */}
            <Alert
              message={
                <Space>
                  <span style={{ fontSize: 14 }}>
                    {TEST_MODE_CONFIG[testMode].icon} <strong>{TEST_MODE_CONFIG[testMode].label}</strong>
                  </span>
                </Space>
              }
              description={TEST_MODE_CONFIG[testMode].description}
              type={testMode === 'app_specific' ? 'info' : 'success'}
              showIcon={false}
              style={{ marginTop: 8, fontSize: 12 }}
            />
          </div>
        </Form.Item>

        <Divider />

        {/* 操作按钮 */}
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space>
            <Button
              type="primary"
              icon={<AimOutlined />}
              loading={loading}
              onClick={handleSmartFind}
            >
              {loading ? '检测中...' : (
                <>
                  {TEST_MODE_CONFIG[testMode].icon} 智能检测
                  {testMode === 'app_specific' && selectedPreset !== '自定义配置' 
                    ? ` (${selectedPreset.split('_')[0]})` 
                    : testMode === 'direct_adb' 
                    ? ' (当前界面)' 
                    : ''
                  }
                </>
              )}
            </Button>
            
            {result?.success && result.target_element && onStepGenerated && (
              <Button
                type="default"
                icon={<PlayCircleOutlined />}
                onClick={handleGenerateStep}
              >
                生成脚本步骤
              </Button>
            )}
          </Space>

          {/* 当前模式提示 */}
          <div style={{ fontSize: 12, color: '#666' }}>
            <Space>
              <span>{TEST_MODE_CONFIG[testMode].icon}</span>
              <span>当前模式: {TEST_MODE_CONFIG[testMode].label}</span>
              {testMode === 'app_specific' && selectedPreset !== '自定义配置' && (
                <Tag color="blue">目标应用: {selectedPreset.split('_')[0]}</Tag>
              )}
              {testMode === 'direct_adb' && (
                <Tag color="green">直接检测当前界面</Tag>
              )}
            </Space>
          </div>
        </Space>
      </Form>

      {/* 检测结果展示 */}
      {loading && (
        <Alert
          message={
            <Space>
              <Spin indicator={<LoadingOutlined spin />} />
              <span>正在分析导航栏结构...</span>
            </Space>
          }
          type="info"
          style={{ marginTop: 16 }}
        />
      )}

      {result && (
        <Card
          title="检测结果"
          size="small"
          style={{ marginTop: 16 }}
          type="inner"
        >
          <Alert
            message={result.message}
            type={result.success ? 'success' : 'warning'}
            style={{ marginBottom: 16 }}
          />

          {result.navigation_area && (
            <div style={{ marginBottom: 16 }}>
              <Text strong>导航区域: </Text>
              <Tag color="blue">{result.navigation_area.position}</Tag>
              <Text type="secondary">{result.navigation_area.bounds}</Text>
            </div>
          )}

          {result.found_elements && result.found_elements.length > 0 && (
            <div>
              <Text strong>找到的导航按钮:</Text>
              <div style={{ marginTop: 8 }}>
                {result.found_elements.map((element, index) => (
                  <Tag
                    key={index}
                    color={element === result.target_element ? 'green' : 'blue'}
                    style={{ marginBottom: 4, cursor: 'pointer' }}
                    onClick={() => handleClickElement(element)}
                  >
                    {element === result.target_element && <CheckCircleOutlined />}
                    {element.text} [{element.position[0]}, {element.position[1]}]
                  </Tag>
                ))}
              </div>
              <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: 8 }}>
                点击标签可直接测试点击该按钮
              </Text>
            </div>
          )}
        </Card>
      )}
    </Card>
  );
};

export default SmartNavigationFinder;