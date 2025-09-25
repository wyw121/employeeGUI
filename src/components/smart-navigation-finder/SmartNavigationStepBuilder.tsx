import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Select, 
  Button, 
  Space, 
  Radio, 
  Input, 
  message, 
  Typography, 
  Tag, 
  Divider,
  Alert,
  Spin
} from 'antd';
import { 
  AimOutlined, 
  PlayCircleOutlined, 
  CheckCircleOutlined, 
  SettingOutlined
} from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';
import { UniversalUIService, type SmartNavigationParams, type UniversalClickResult } from '../../api/universalUIAPI';

const { Title, Text } = Typography;
const { Option } = Select;

// 使用现有的接口定义
export interface NavigationBarConfig {
    position_type: 'bottom' | 'top' | 'side' | 'floating';
    position_ratio?: {
        x_start: number;
        x_end: number;
        y_start: number;
        y_end: number;
    };
    button_count?: number;
    button_patterns: string[];
    target_button: string;
    click_action: 'single_tap' | 'double_tap' | 'long_press';
}

export interface DetectedElement {
  text: string;
  content_desc: string;
  clickable: boolean;
  position: [number, number];
}

export interface ElementFinderResult {
    success: boolean;
    message: string;
    found_elements?: DetectedElement[];
    target_element?: DetectedElement;
}

interface SmartNavigationStepBuilderProps {
    deviceId?: string;
    onStepGenerated: (step: any) => void; // 生成智能脚本步骤的回调
    onConfigChange?: (config: { app: string; navType: string }) => void; // 新增：配置变化回调
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

// 导航栏类型配置
const NAVIGATION_TYPES = {
  '下方导航栏': {
    key: 'bottom',
    description: '应用底部的主导航栏',
    icon: '📱',
    position_ratio: { x_start: 0.0, x_end: 1.0, y_start: 0.9, y_end: 1.0 }
  },
  '顶部导航栏': {
    key: 'top', 
    description: '应用顶部的导航栏',
    icon: '📋',
    position_ratio: { x_start: 0.0, x_end: 1.0, y_start: 0.0, y_end: 0.1 }
  },
  '侧边导航栏': {
    key: 'side',
    description: '应用侧边的抽屉导航',
    icon: '🗂️',
    position_ratio: { x_start: 0.0, x_end: 0.3, y_start: 0.0, y_end: 1.0 }
  }
};

// 应用预设配置
const APP_PRESETS = {
  '小红书': {
    '下方导航栏': {
      buttons: ['首页', '市集', '发布', '消息', '我'],
      position_ratio: { x_start: 0.0, x_end: 1.0, y_start: 0.93, y_end: 1.0 }
    }
  },
  '微信': {
    '下方导航栏': {
      buttons: ['微信', '通讯录', '发现', '我'],
      position_ratio: { x_start: 0.0, x_end: 1.0, y_start: 0.9, y_end: 1.0 }
    }
  },
  '抖音': {
    '下方导航栏': {
      buttons: ['首页', '朋友', '拍摄', '消息', '我'],
      position_ratio: { x_start: 0.0, x_end: 1.0, y_start: 0.92, y_end: 1.0 }
    }
  }
};

// 常用按钮预设
const COMMON_BUTTONS = {
  '个人中心': ['我', '我的', '个人中心', '账号'],
  '首页': ['首页', '主页', 'Home'],
  '发现': ['发现', '探索', '推荐'],
  '消息': ['消息', '聊天', '通知'],
  '设置': ['设置', '更多', '菜单']
};

const SmartNavigationStepBuilder: React.FC<SmartNavigationStepBuilderProps> = ({
  deviceId,
  onStepGenerated,
  onConfigChange
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [detectionResult, setDetectionResult] = useState<ElementFinderResult | null>(null);
  
  // UI 状态
  const [selectedNavType, setSelectedNavType] = useState<string>('下方导航栏');
  const [selectedApp, setSelectedApp] = useState<string>('小红书');
  const [buttonInputMode, setButtonInputMode] = useState<'preset' | 'custom'>('preset');
  const [selectedButtonPreset, setSelectedButtonPreset] = useState<string>('个人中心');
  const [testMode, setTestMode] = useState<TestMode>('app_specific'); // 新增：测试模式状态

  // 初始化表单
  useEffect(() => {
    form.setFieldsValue({
      target_button: '我',
      click_action: 'single_tap'
    });
  }, []);

  // 监听配置变化，通知父组件
  useEffect(() => {
    const formValues = form.getFieldsValue();
    
    // 操作类型映射
    const actionTypeMap = {
      'single_tap': '单击',
      'double_tap': '双击', 
      'long_press': '长按'
    };
    const actionType = actionTypeMap[formValues.click_action as keyof typeof actionTypeMap] || '点击';
    const targetButton = formValues.target_button || '我';
    
    // 组合完整的步骤描述：操作方式 + 位置类型 + 目标按钮
    const detailedDescription = `${actionType} ${selectedNavType} "${targetButton}"`;
    
    console.log('📊 向导模式配置变化:', { 
      app: selectedApp, 
      navType: detailedDescription 
    }); // 调试信息
    
    onConfigChange?.({
      app: selectedApp,
      navType: detailedDescription
    });
  }, [selectedApp, selectedNavType, form, onConfigChange]);

  // 表单值变化时也通知配置更新
  const handleFormValuesChange = () => {
    // 延迟一点点让表单值更新
    setTimeout(() => {
      const formValues = form.getFieldsValue();
      
      const actionTypeMap = {
        'single_tap': '单击',
        'double_tap': '双击', 
        'long_press': '长按'
      };
      const actionType = actionTypeMap[formValues.click_action as keyof typeof actionTypeMap] || '点击';
      const targetButton = formValues.target_button || '我';
      
      const detailedDescription = `${actionType} ${selectedNavType} "${targetButton}"`;
      
      console.log('📊 向导模式表单变化:', { 
        app: selectedApp, 
        navType: detailedDescription 
      }); // 调试信息
      
      onConfigChange?.({
        app: selectedApp,
        navType: detailedDescription
      });
    }, 0);
  };

  // 获取当前按钮选项
  const getCurrentButtons = () => {
    const appConfig = APP_PRESETS[selectedApp as keyof typeof APP_PRESETS];
    if (appConfig && appConfig[selectedNavType as keyof typeof appConfig]) {
      return appConfig[selectedNavType as keyof typeof appConfig].buttons;
    }
    return [];
  };

  // 获取按钮预设选项
  const getButtonPresetOptions = () => {
    if (buttonInputMode === 'preset') {
      const currentButtons = getCurrentButtons();
      if (currentButtons.length > 0) {
        return currentButtons;
      }
      return COMMON_BUTTONS[selectedButtonPreset as keyof typeof COMMON_BUTTONS] || [];
    }
    return [];
  };

  // 构建配置对象
  const buildConfig = (): NavigationBarConfig => {
    const formValues = form.getFieldsValue();
    const navType = NAVIGATION_TYPES[selectedNavType as keyof typeof NAVIGATION_TYPES];
    
    // 获取位置配置
    let position_ratio = navType.position_ratio;
    const appConfig = APP_PRESETS[selectedApp as keyof typeof APP_PRESETS];
    if (appConfig && appConfig[selectedNavType as keyof typeof appConfig]) {
      position_ratio = appConfig[selectedNavType as keyof typeof appConfig].position_ratio;
    }

    return {
      position_type: navType.key as 'bottom' | 'top' | 'side' | 'floating',
      position_ratio,
      button_patterns: getCurrentButtons(),
      target_button: formValues.target_button || '我',
      click_action: formValues.click_action || 'single_tap'
    };
  };

  // 执行智能检测
  const handleSmartDetection = async () => {
    console.log('🔧 执行智能检测 - deviceId:', deviceId);
    
    // 如果没有提供deviceId，使用默认的模拟器ID进行测试
    const testDeviceId = deviceId || 'emulator-5554';
    
    if (!testDeviceId) {
      message.error('请先选择设备');
      return;
    }

    try {
      setLoading(true);
      const formValues = form.getFieldsValue();
      
      // 构建Universal UI参数
      const navigationParams: SmartNavigationParams = {
        navigation_type: selectedNavType,
        target_button: formValues.target_button || '我',
        click_action: formValues.click_action || 'single_tap',
        // 根据测试模式决定是否传递app_name
        app_name: testMode === 'app_specific' ? selectedApp : undefined, // 关键修改
      };
      
      console.log(`🔧 Universal UI 智能检测 [${TEST_MODE_CONFIG[testMode].label}]:`, {
        deviceId: testDeviceId,
        navigationParams
      });
      
      // 使用新的Universal UI API进行检测（仅查找，不执行点击）
  const result = await UniversalUIService.executeUIClick(testDeviceId, navigationParams);

      // 将结果转换为前端格式
      const toTuple = (pos?: string): [number, number] | undefined => {
        if (!pos) return undefined;
        const m = pos.match(/\(([-\d.]+),\s*([-\d.]+)\)/);
        if (m) return [Number(m[1]), Number(m[2])];
        const parts = pos.split(/[ ,]+/).map(Number).filter(n => !Number.isNaN(n));
        return parts.length >= 2 ? [parts[0], parts[1]] : undefined;
      };

      const elementFinderResult: ElementFinderResult = {
        success: result.element_found,
        message: result.element_found 
          ? `✅ [${result.mode}] 成功找到目标按钮 "${navigationParams.target_button}"` 
          : (result.error_message || '未找到目标按钮'),
        found_elements: result.found_element ? [{
          text: result.found_element.text,
          position: toTuple(result.found_element.position) || [0, 0],
          content_desc: '',
          clickable: true,
        }] : [],
        target_element: result.found_element ? {
          text: result.found_element.text,
          position: toTuple(result.found_element.position) || [0, 0],
          content_desc: '',
          clickable: true,
        } : undefined,
      };

      setDetectionResult(elementFinderResult);

      if (result.element_found) {
        message.success(`✅ 成功检测到导航元素！(${result.mode}, ${result.execution_time_ms}ms)`);
      } else {
        message.warning(result.error_message || '未找到目标按钮');
      }
    } catch (error) {
      console.error('智能检测失败:', error);
      message.error(`检测失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 确认配置（不直接生成步骤，而是通知父组件配置已完成）
  const handleConfirmConfiguration = () => {
    if (!detectionResult?.target_element) {
      message.error('请先成功检测到目标元素');
      return;
    }

    const formValues = form.getFieldsValue();
    const config = buildConfig();
    
    const step = {
      id: Date.now(),
      type: 'smart_navigation',
      name: `导航操作: ${config.target_button}`,
      description: `在${selectedApp}的${selectedNavType}中查找并${formValues.click_action === 'single_tap' ? '点击' : formValues.click_action === 'long_press' ? '长按' : '双击'}"${config.target_button}"`,
      // 为表单自动填充提供必要信息
      parameters: {
        app_name: selectedApp,
        navigation_type: selectedNavType,
        target_button: config.target_button,
        click_action: config.click_action,
        detected_element: detectionResult.target_element,
        // 传递完整配置
        config: {
          app: selectedApp,
          navigation_type: selectedNavType,
          target_button: config.target_button,
          click_action: config.click_action,
          detected_element: detectionResult.target_element
        },
        execution_config: config
      }
    };

    onStepGenerated(step);
    console.log('🎯 SmartNavigationStepBuilder 调用 onStepGenerated:', step); // 调试信息
    message.success(`配置已确认，请点击底部"确定添加"按钮完成步骤添加`);
  };

  return (
    <Card 
      title={
        <Space>
          <AimOutlined style={{ color: '#1890ff' }} />
          <span>智能导航栏操作</span>
          <Tag color="blue">步骤生成器</Tag>
        </Space>
      }
      size="small"
    >
      <Form form={form} layout="vertical" onValuesChange={handleFormValuesChange}>
        {/* 第一步：选择导航栏类型 */}
        <div>
          <Text strong>1. 选择导航栏类型</Text>
          <div style={{ marginTop: 8, marginBottom: 16 }}>
            <Radio.Group 
              value={selectedNavType} 
              onChange={(e) => setSelectedNavType(e.target.value)}
              style={{ width: '100%' }}
            >
              {Object.entries(NAVIGATION_TYPES).map(([key, config]) => (
                <Radio.Button key={key} value={key} style={{ marginBottom: 4 }}>
                  <Space>
                    <span>{config.icon}</span>
                    <span>{key}</span>
                  </Space>
                </Radio.Button>
              ))}
            </Radio.Group>
          </div>
        </div>

        {/* 第二步：选择应用预设 */}
        <div>
          <Text strong>2. 选择应用预设</Text>
          <Select 
            value={selectedApp}
            onChange={setSelectedApp}
            style={{ width: '100%', marginTop: 8, marginBottom: 16 }}
            placeholder="选择目标应用"
          >
            {Object.keys(APP_PRESETS).map(app => (
              <Option key={app} value={app}>
                <Space>
                  <span>{app}</span>
                  <Text type="secondary">
                    {APP_PRESETS[app as keyof typeof APP_PRESETS][selectedNavType as keyof typeof APP_PRESETS[keyof typeof APP_PRESETS]]?.buttons?.length || 0} 个按钮
                  </Text>
                </Space>
              </Option>
            ))}
          </Select>
        </div>

        {/* 第三步：选择目标按钮 */}
        <div>
          <Text strong>3. 选择目标按钮</Text>
          <div style={{ marginTop: 8, marginBottom: 16 }}>
            <Radio.Group 
              value={buttonInputMode} 
              onChange={(e) => setButtonInputMode(e.target.value)}
              style={{ marginBottom: 8 }}
            >
              <Radio value="preset">预设按钮</Radio>
              <Radio value="custom">手动输入</Radio>
            </Radio.Group>

            {buttonInputMode === 'preset' ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                {getCurrentButtons().length > 0 ? (
                  <Form.Item name="target_button" style={{ marginBottom: 0 }}>
                    <Select placeholder="选择目标按钮">
                      {getCurrentButtons().map(button => (
                        <Option key={button} value={button}>{button}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                ) : (
                  <div>
                    <Text>常用按钮分类:</Text>
                    <Select 
                      value={selectedButtonPreset}
                      onChange={setSelectedButtonPreset}
                      style={{ width: '100%', marginBottom: 8 }}
                    >
                      {Object.keys(COMMON_BUTTONS).map(category => (
                        <Option key={category} value={category}>{category}</Option>
                      ))}
                    </Select>
                    <Form.Item name="target_button" style={{ marginBottom: 0 }}>
                      <Select placeholder="选择按钮">
                        {COMMON_BUTTONS[selectedButtonPreset as keyof typeof COMMON_BUTTONS]?.map(button => (
                          <Option key={button} value={button}>{button}</Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </div>
                )}
              </Space>
            ) : (
              <Form.Item name="target_button" style={{ marginBottom: 0 }}>
                <Input placeholder="输入按钮文字，如：我的、设置" />
              </Form.Item>
            )}
          </div>
        </div>

        {/* 第四步：选择操作动作 */}
        <div>
          <Text strong>4. 选择操作动作</Text>
          <Form.Item name="click_action" style={{ marginTop: 8, marginBottom: 16 }}>
            <Radio.Group>
              <Radio.Button value="single_tap">单击</Radio.Button>
              <Radio.Button value="double_tap">双击</Radio.Button>
              <Radio.Button value="long_press">长按</Radio.Button>
            </Radio.Group>
          </Form.Item>
        </div>

        {/* 第五步：选择测试模式 */}
        <div>
          <Text strong>5. 选择测试模式</Text>
          <div style={{ marginTop: 8, marginBottom: 16 }}>
            <Radio.Group 
              value={testMode} 
              onChange={(e) => setTestMode(e.target.value)}
              style={{ width: '100%' }}
            >
              {Object.entries(TEST_MODE_CONFIG).map(([key, config]) => (
                <Radio.Button 
                  key={key} 
                  value={key}
                  style={{ 
                    marginRight: 8, 
                    marginBottom: 8,
                    borderColor: config.color === 'blue' ? '#1890ff' : '#52c41a'
                  }}
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
        </div>

        <Divider />

        {/* 操作按钮 */}
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space>
            <Button 
              type="primary" 
              icon={<AimOutlined />}
              loading={loading}
              onClick={handleSmartDetection}
            >
              {TEST_MODE_CONFIG[testMode].icon} 智能检测
              {testMode === 'app_specific' ? ` (${selectedApp})` : ' (当前界面)'}
            </Button>
            
            {detectionResult?.success && detectionResult.target_element && (
              <Button 
                type="default" 
                icon={<CheckCircleOutlined />}
                onClick={handleConfirmConfiguration}
              >
                确认配置
              </Button>
            )}
          </Space>

          {/* 当前模式提示 */}
          <div style={{ fontSize: 12, color: '#666' }}>
            <Space>
              <span>{TEST_MODE_CONFIG[testMode].icon}</span>
              <span>当前模式: {TEST_MODE_CONFIG[testMode].label}</span>
              {testMode === 'app_specific' && (
                <Tag color="blue">目标应用: {selectedApp}</Tag>
              )}
              {testMode === 'direct_adb' && (
                <Tag color="green">直接检测当前界面</Tag>
              )}
            </Space>
          </div>
        </Space>

        {/* 检测结果显示 */}
        {loading && (
          <Alert
            message={
              <Space>
                <Spin size="small" />
                <span>正在智能检测导航栏...</span>
              </Space>
            }
            type="info"
            style={{ marginTop: 16 }}
          />
        )}

        {detectionResult && (
          <Alert
            message={detectionResult.message}
            description={
              detectionResult.success && detectionResult.target_element && (
                <div>
                  <Text strong>找到目标元素: </Text>
                  <Tag color="green">
                    <CheckCircleOutlined /> 
                    {detectionResult.target_element.text} 
                    [{detectionResult.target_element.position[0]}, {detectionResult.target_element.position[1]}]
                  </Tag>
                  {detectionResult.found_elements && detectionResult.found_elements.length > 1 && (
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary">其他检测到的元素: </Text>
                      {detectionResult.found_elements
                        .filter(el => el !== detectionResult.target_element)
                        .map((el, idx) => (
                          <Tag key={idx} style={{ marginBottom: 4 }}>
                            {el.text}
                          </Tag>
                        ))
                      }
                    </div>
                  )}
                </div>
              )
            }
            type={detectionResult.success ? 'success' : 'warning'}
            style={{ marginTop: 16 }}
          />
        )}
      </Form>
    </Card>
  );
};

export default SmartNavigationStepBuilder;